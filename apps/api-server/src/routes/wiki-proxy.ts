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
 * HTML内のHTTP/プロトコル相対URLをプロキシパスに一括書き換え
 */
function rewriteHtmlUrls(html: string): string {
  let result = html;
  for (const [from, to] of URL_REWRITE_MAP) {
    result = result.replaceAll(from, to);
  }
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
      const rewritten = rewriteHtmlUrls(html);

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
