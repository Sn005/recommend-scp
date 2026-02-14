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
 * 1. printer--friendlyモードの印刷オプションUI・印刷ヘッダー（サイト名/ソースURL）を非表示
 * 2. 記事可読性向上（line-height, font-size, spacing）
 *    - モックアップ（header-6-minimal-2btn.html）のスタイルを参考
 *    - 元記事のカラー・装飾は尊重し、可読性に直結するプロパティのみ上書き
 *
 * CSSは初回ペイント前に評価されるため、レイアウトシフトが発生しない。
 */
const INJECTED_STYLE = [
  "<style>",
  // 印刷オプション・印刷ヘッダー非表示
  "#print-options,#print-head{display:none!important}",
  // Wikidot構造要素のレイアウトリセット（#main-contentのmarginで記事幅が狭くなる問題の対処）
  "#container,#main-content{margin:0;padding:0;max-width:none}",
  // 記事タイトル: フォントサイズ調整（design-tokens --font-size-3xl: 24px 準拠）
  "#page-title{font-size:24px;font-weight:bold;padding:0 8px}",
  // 記事可読性: ベースタイポグラフィ
  "body{font-family:'Hiragino Kaku Gothic Pro','ヒラギノ角ゴ Pro W3',Meiryo,sans-serif;line-height:1.8;-webkit-text-size-adjust:100%}",
  // 記事可読性: コンテンツ領域（左右16px余白はモック準拠）
  "#page-content{font-size:15px;overflow-wrap:break-word;word-break:break-word;padding:0 16px}",
  // 記事可読性: 段落間スペーシング
  "#page-content p{margin-bottom:1em}",
  // 記事可読性: 画像レスポンシブ化 + 上下マージン
  "#page-content img{max-width:100%;height:auto;display:block;margin:16px 0}",
  // レイアウト崩れ防止: Wikidot記事のfloatブロックを無効化
  "#page-content .block-left,#page-content .block-right{float:none!important;clear:both!important;text-align:left!important;margin:0 auto!important}",
  "</style>",
].join("");

/**
 * 既にプロキシパスに書き換え済みのプレフィックス
 * これらで始まるパスは rewriteAbsolutePaths で二重変換しない
 */
const PROXY_PATH_PREFIXES = ["wiki/", "wdfiles-", "wikidot-", "api/", "common--", "local--"];

/**
 * URL_REWRITE_MAPで /wiki/ に変換されたhrefのうち、記事リンクのみを
 * /api/wiki-proxy/ に書き換える正規表現
 *
 * common--/local-- で始まるリソースパスは除外（Next.js rewritesで処理）
 */
const WIKI_ARTICLE_HREF_RE = /href="\/wiki\/(?!common--|local--)/g;

/**
 * </body>直前に注入するJavaScript
 *
 * iframe内のリンククリックをインターセプトし、記事リンクをプロキシ経由で遷移させる。
 * HTML書き換えで対応できない動的生成リンクの安全策として機能する。
 *
 * 処理:
 * 1. 既にプロキシ済みのリンク → そのまま通過
 * 2. リソースパス（common--, local--, wdfiles, wikidot） → そのまま通過
 * 3. /wiki/ 記事リンク → /api/wiki-proxy/ 経由に変換
 * 4. 外部リンク（http/https） → 新しいタブで開く
 * 5. その他の絶対パスリンク → /api/wiki-proxy/ 経由に変換
 * 6. collapsible-block の開閉トグル（WIKIDOT.combined.js の代替）
 */
const INJECTED_SCRIPT = [
  "<script>",
  "document.addEventListener('click',function(e){",
  "var a=e.target.closest('a[href]');",
  "if(!a)return;",
  "var h=a.getAttribute('href');",
  "if(!h||h.charAt(0)==='#'||h.indexOf('javascript:')===0)return;",
  "if(h.indexOf('/api/wiki-proxy/')===0)return;",
  "if(h.indexOf('/common--')===0||h.indexOf('/local--')===0)return;",
  "if(h.indexOf('/wdfiles')===0||h.indexOf('/wikidot')===0)return;",
  "if(h.indexOf('/wiki/')===0){",
  "var p=h.slice(6);",
  "if(p.indexOf('common--')===0||p.indexOf('local--')===0)return;",
  "e.preventDefault();",
  "location.href='/api/wiki-proxy/'+p;",
  "return}",
  "if(h.indexOf('http')===0||h.indexOf('//')===0){",
  "e.preventDefault();",
  "window.open(h,'_blank','noopener');",
  "return}",
  "if(h.charAt(0)==='/'){",
  "e.preventDefault();",
  "location.href='/api/wiki-proxy'+h;",
  "return}",
  "});",
  // collapsible-block 開閉（WIKIDOT.combined.js の代替）
  // printer--friendlyモードではWIKIDOT.combined.jsが読み込まれないため、
  // collapsible-block の開閉をバニラJSで再実装する。
  "document.addEventListener('click',function(e){",
  "var l=e.target.closest('a.collapsible-block-link');",
  "if(!l)return;",
  "e.preventDefault();",
  "var b=l.closest('div.collapsible-block');",
  "if(!b)return;",
  "var f=b.querySelector('.collapsible-block-folded');",
  "var u=b.querySelector('.collapsible-block-unfolded');",
  "if(!f||!u)return;",
  "if(getComputedStyle(f).display!=='none'){",
  "f.style.display='none';",
  "u.style.display='block'",
  "}else{",
  "u.style.display='none';",
  "f.style.display='block'",
  "}",
  "})",
  "</script>",
].join("");

/**
 * HTML要素のインラインstyle属性を除去する正規表現
 *
 * Wikidot記事には `style="text-align: right;"` 等のインラインスタイルが含まれることがあり、
 * モバイル表示でレイアウト崩れを起こす。記事の装飾はInjected CSSで制御するため、
 * インラインstyle属性は安全に除去できる。
 *
 * - `style="..."` （ダブルクォート）を対象
 * - 属性前の空白ごと除去してHTML構造を保持
 */
const INLINE_STYLE_ATTR_RE = / style="[^"]*"/gi;

/**
 * href="/path" 形式の絶対パスリンクを href="/api/wiki-proxy/path" に書き換える正規表現
 *
 * Wiki HTML内のドメインなし絶対パスリンク（例: href="/scp-456"）は
 * URL_REWRITE_MAP では変換されない。
 * そのままだとiframe内で /scp-456 に遷移し、Next.jsの404になるため、
 * /api/wiki-proxy/ 経由に変換して、printer--friendlyモード + CSS注入 + URL書き換えを適用する。
 *
 * 否定先読みで既にプロキシパスに変換済みの href は除外する。
 */
const ABSOLUTE_PATH_HREF_RE = new RegExp(`href="/(?!${PROXY_PATH_PREFIXES.join("|")})`, "g");

/**
 * CloudFront URLのHTTPをHTTPSにプロトコル変換する正規表現
 *
 * WikidotのCDN（*.cloudfront.net）はHTTPS対応済みのため、
 * プロキシ不要でプロトコル変換のみで mixed content を回避できる。
 */
const CLOUDFRONT_HTTP_RE = /http:\/\/([a-z0-9]+\.cloudfront\.net\/)/g;

/**
 * HTML書き換え: URL変換 + CSS注入 + 記事リンクのプロキシ化 + リンクインターセプトJS注入
 *
 * 処理順序:
 * 1. CSS注入（</head>前、初回ペイント前に適用）
 * 2. インラインstyle属性の除去（レイアウト崩れ防止）
 * 3. フルURL書き換え（URL_REWRITE_MAP: http://domain/ → /proxy-path/）
 * 4. CloudFront URLのプロトコル変換（http:// → https://）
 * 5. 絶対パスhref書き換え（/scp-456 → /api/wiki-proxy/scp-456）
 * 6. /wiki/ 記事hrefをプロキシ経由に変換（/wiki/scp-456 → /api/wiki-proxy/scp-456）
 * 7. リンクインターセプトJS注入（</body>前、動的リンクの安全策）
 */
function rewriteHtml(html: string): string {
  // 1. CSS注入（大文字小文字不問 + フォールバック）
  let result: string;
  const headCloseRe = /<\/head>/i;
  const bodyOpenRe = /<body[^>]*>/i;
  if (headCloseRe.test(html)) {
    result = html.replace(headCloseRe, `${INJECTED_STYLE}</head>`);
  } else if (bodyOpenRe.test(html)) {
    // </head>がない場合は<body>直後に注入
    result = html.replace(bodyOpenRe, `$&${INJECTED_STYLE}`);
  } else {
    // どちらもない場合は先頭に注入
    result = INJECTED_STYLE + html;
  }
  // 2. インラインstyle属性の除去
  result = result.replace(INLINE_STYLE_ATTR_RE, "");
  // 3. フルURL書き換え
  for (const [from, to] of URL_REWRITE_MAP) {
    result = result.replaceAll(from, to);
  }
  // 4. CloudFront URLのプロトコル変換（HTTPS対応済みCDNなのでプロキシ不要）
  result = result.replace(CLOUDFRONT_HTTP_RE, "https://$1");
  // 5. ドメインなし絶対パスhrefをプロキシ経由に書き換え
  result = result.replace(ABSOLUTE_PATH_HREF_RE, 'href="/api/wiki-proxy/');
  // 6. URL_REWRITE_MAPで /wiki/ に変換された記事hrefをプロキシ経由に変換
  result = result.replace(WIKI_ARTICLE_HREF_RE, 'href="/api/wiki-proxy/');
  // 7. リンクインターセプトJS注入（大文字小文字不問）
  result = result.replace(/<\/body>/i, `${INJECTED_SCRIPT}</body>`);
  return result;
}

/**
 * リクエストパスからwiki-proxy以降のパスを抽出
 *
 * Hono basePath(/api)を含む完全パスに対応。
 * c.req.path はルーティングコンテキスト（basePath有無）に関わらず
 * リクエストの完全パスを返すため、正規表現で /wiki-proxy/ 以降を抽出する。
 *
 * 注意: Honoのワイルドカードパラメータ c.req.param("*") は
 * .route() でネストされた場合に空になるため使用しない。
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
  const rawPath = extractProxyPath(c.req.path);

  if (!rawPath) {
    return c.json({ error: "path is required" }, 400);
  }

  // Wikidotのprinter--friendlyはスラッグが小文字でないと正常に動作しない。
  // DBに大文字で格納されたarticle_id（例: "SCP-2000"）経由のリクエストに対応するため、
  // パスを小文字に正規化する。
  const path = rawPath.toLowerCase();

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
