/**
 * @file Wikiプロキシエンドポイント
 * @description SCP Wiki (HTTP) コンテンツをHTTPS経由で配信するリバースプロキシ。
 * HTMLレスポンス内のHTTP URLをプロキシパスに書き換え、mixed contentを完全に回避する。
 */

import { Hono } from "hono";

/**
 * 許可するWikidotドメイン（セキュリティのため制限）
 */
const ALLOWED_WIKIDOT_DOMAIN = "scp-jp.wikidot.com";

/**
 * HTMLレスポンス内のHTTP/プロトコル相対URLをプロキシパスに書き換えるマッピング
 *
 * 各ドメインについて http:// と // (プロトコル相対) の両方を書き換える。
 * 順序: 長いドメインから先に処理（部分マッチ防止）
 *
 * - wdfiles.com: Wikidotのファイルストレージ（画像・CSS等）
 * - www.wikidot.com: Wikidot共通リソース
 * - scp-jp.wikidot.com: SCP-JPサイト自体のリソース
 */
const URL_REWRITE_MAP: readonly (readonly [string, string])[] = [
  // scp-jp-storage.wdfiles.com
  ["http://scp-jp-storage.wdfiles.com/", "/wdfiles-scp-jp-storage/"],
  ["//scp-jp-storage.wdfiles.com/", "/wdfiles-scp-jp-storage/"],
  // scp-jp.wdfiles.com
  ["http://scp-jp.wdfiles.com/", "/wdfiles-scp-jp/"],
  ["//scp-jp.wdfiles.com/", "/wdfiles-scp-jp/"],
  // static.wdfiles.com（プラットフォームテーマCSS）
  ["http://static.wdfiles.com/", "/wdfiles-static/"],
  ["//static.wdfiles.com/", "/wdfiles-static/"],
  // static-l.wdfiles.com（プラットフォームテーマCSS: ロードバランサ）
  ["http://static-l.wdfiles.com/", "/wdfiles-static-l/"],
  ["//static-l.wdfiles.com/", "/wdfiles-static-l/"],
  // static.wikidot.com（プラットフォーム静的リソース）
  ["http://static.wikidot.com/", "/wikidot-static/"],
  ["//static.wikidot.com/", "/wikidot-static/"],
  // www.wikidot.com
  ["http://www.wikidot.com/", "/wikidot-www/"],
  ["//www.wikidot.com/", "/wikidot-www/"],
  // scp-jp.wikidot.com（最後に処理: 他のドメインを先に処理するため）
  ["http://scp-jp.wikidot.com/", "/wiki/"],
  ["//scp-jp.wikidot.com/", "/wiki/"],
];

/**
 * <head>末尾に注入するCSS
 *
 * 1. printer--friendlyモードの印刷オプションUIを非表示
 * 2. 記事可読性向上（line-height, font-size, spacing）
 *    - モックアップ（header-6-minimal-2btn.html）のスタイルを参考
 *    - 元記事のカラー・装飾は尊重し、可読性に直結するプロパティのみ上書き
 *
 * CSSは初回ペイント前に評価されるため、レイアウトシフトが発生しない。
 */
const INJECTED_STYLE = [
  "<style>",
  // 印刷オプション非表示
  "#print-options{display:none!important}",
  // 記事可読性: ベースタイポグラフィ
  "body{font-family:'Hiragino Kaku Gothic Pro','ヒラギノ角ゴ Pro W3',Meiryo,sans-serif;line-height:1.8;-webkit-text-size-adjust:100%}",
  // 記事可読性: コンテンツ領域
  "#page-content{font-size:15px;padding:16px;overflow-wrap:break-word;word-break:break-word}",
  // 記事可読性: 段落間スペーシング
  "#page-content p{margin-bottom:1em}",
  // 記事可読性: 画像レスポンシブ化
  "#page-content img{max-width:100%;height:auto}",
  "</style>",
].join("");

/**
 * 既にプロキシパスに書き換え済みのプレフィックス
 * これらで始まるパスは rewriteAbsolutePaths で二重変換しない
 */
const PROXY_PATH_PREFIXES = ["wiki/", "wdfiles-", "wikidot-", "api/", "common--", "local--"];

/**
 * href="/path" 形式の絶対パスリンクを href="/wiki/path" に書き換える正規表現
 *
 * Wiki HTML内のドメインなし絶対パスリンク（例: href="/scp-456"）は
 * URL_REWRITE_MAP では変換されない。
 * そのままだとiframe内で /scp-456 に遷移し、Next.jsの404になるため、
 * /wiki/ プレフィックスを付与して Next.js rewrites 経由でWikiにプロキシする。
 *
 * 否定先読みで既にプロキシパスに変換済みの href は除外する。
 */
const ABSOLUTE_PATH_HREF_RE = new RegExp(`href="/(?!${PROXY_PATH_PREFIXES.join("|")})`, "g");

/**
 * HTML書き換え: URL変換 + 不要要素の非表示CSS注入 + 絶対パスリンク修正
 */
function rewriteHtml(html: string): string {
  // </head> 直前にCSSを注入（初回ペイント前に適用される）
  let result = html.replace("</head>", `${INJECTED_STYLE}</head>`);
  for (const [from, to] of URL_REWRITE_MAP) {
    result = result.replaceAll(from, to);
  }
  // ドメインなし絶対パスリンクを /wiki/ 経由に書き換え
  result = result.replace(ABSOLUTE_PATH_HREF_RE, 'href="/wiki/');
  return result;
}

/**
 * リクエストパスからwiki-proxy以降のパスを抽出
 * Hono basePath(/api)を含む完全パスに対応
 *
 * 例: "/api/wiki-proxy/scp-173" → "scp-173"
 *     "/wiki-proxy/scp-173"     → "scp-173"
 */
function extractProxyPath(requestPath: string): string {
  const match = /\/wiki-proxy\/(.+)/.exec(requestPath);
  return match?.[1] ?? "";
}

/**
 * GET /wiki-proxy/*
 *
 * SCP Wikiページをprinter--friendlyモードでプロキシ配信。
 * printer--friendlyはサイドバー・トップバー・ナビゲーションを除去し、
 * 記事本文のみを返すWikidot組み込み機能。
 * HTMLの場合はURL書き換えを行い、CSS/JS/画像等はそのままパススルーする。
 */
export const wikiProxyRoutes = new Hono().get("/*", async (c) => {
  const path = extractProxyPath(c.req.path);

  if (!path) {
    return c.json({ error: "path is required" }, 400);
  }

  // printer--friendly: サイドバー・ナビ・広告を除去して記事本文のみ取得
  const targetUrl = `http://${ALLOWED_WIKIDOT_DOMAIN}/printer--friendly/${path}`;

  try {
    const response = await fetch(targetUrl);

    const contentType = response.headers.get("content-type") ?? "";

    // HTMLレスポンス: URL書き換えを適用
    if (contentType.includes("text/html")) {
      const html = await response.text();
      const rewritten = rewriteHtml(html);

      return new Response(rewritten, {
        status: response.status,
        headers: {
          "content-type": contentType,
          "cache-control": "public, max-age=300, s-maxage=600",
        },
      });
    }

    // 非HTMLリソース（CSS/JS/画像等）: パススルー
    return new Response(response.body, {
      status: response.status,
      headers: {
        "content-type": contentType,
        "cache-control": "public, max-age=3600, s-maxage=86400",
      },
    });
  } catch {
    return c.json({ error: "Failed to fetch wiki content" }, 502);
  }
});
