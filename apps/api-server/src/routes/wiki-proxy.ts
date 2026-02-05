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
 * HTMLレスポンス内のHTTP URLをプロキシパスに書き換えるマッピング
 *
 * - wdfiles.com: Wikidotのファイルストレージ（画像・CSS等）
 * - www.wikidot.com: Wikidot共通リソース
 * - scp-jp.wikidot.com: SCP-JPサイト自体のリソース
 */
const URL_REWRITE_MAP: ReadonlyArray<readonly [string, string]> = [
  ["http://scp-jp-storage.wdfiles.com/", "/wdfiles-scp-jp-storage/"],
  ["http://scp-jp.wdfiles.com/", "/wdfiles-scp-jp/"],
  ["http://www.wikidot.com/", "/wikidot-www/"],
  ["http://scp-jp.wikidot.com/", "/wiki/"],
];

/**
 * HTML内のHTTP URLをプロキシパスに一括書き換え
 */
function rewriteHtmlUrls(html: string): string {
  let result = html;
  for (const [from, to] of URL_REWRITE_MAP) {
    result = result.replaceAll(from, to);
  }
  return result;
}

/**
 * GET /wiki-proxy/*
 *
 * SCP Wikiページをプロキシ配信。HTMLの場合はURL書き換えを行い、
 * CSS/JS/画像等はそのままパススルーする。
 */
export const wikiProxyRoutes = new Hono().get("/*", async (c) => {
  const path = c.req.path.replace(/^\/wiki-proxy\/?/, "");

  if (!path) {
    return c.json({ error: "path is required" }, 400);
  }

  const targetUrl = `http://${ALLOWED_WIKIDOT_DOMAIN}/${path}`;

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
