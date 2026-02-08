/**
 * @file URLチェック（プロキシ）エンドポイント
 * @description クロスオリジン制限を回避して404検知を行うためのプロキシAPI
 * @see specs/010-ja-article-display/010-03-webview-ja/010-03-02.md
 */

import { Hono } from "hono";

/**
 * 許可するドメインのリスト（セキュリティのため制限）
 */
const ALLOWED_DOMAINS = [
  "scp-jp.wikidot.com",
  "scp-wiki.wikidot.com",
  "fondazionescp.wikidot.com",
  "scp-wiki-cn.wikidot.com",
  "scp-kr.wikidot.com",
  "scp-wiki.net",
];

/**
 * URLがドメイン許可リストに含まれているか検証
 */
const isAllowedDomain = (urlString: string): boolean => {
  try {
    const url = new URL(urlString);
    return ALLOWED_DOMAINS.includes(url.hostname);
  } catch {
    return false;
  }
};

/**
 * GET /check-url
 *
 * 指定されたURLが存在するか（404でないか）をチェック。
 * クロスオリジン制限を回避するためのサーバーサイドプロキシ。
 *
 * Query Parameters:
 * - url: チェック対象のURL
 *
 * Response:
 * - 200 OK: { exists: boolean }
 * - 400 Bad Request: URLパラメータが不正
 */
export const checkUrlRoutes = new Hono().get("/", async (c) => {
  const url = c.req.query("url");

  // バリデーション: URLが必須
  if (!url) {
    return c.json({ error: "url is required" }, 400);
  }

  // セキュリティ: 許可されたドメインのみアクセス可能
  if (!isAllowedDomain(url)) {
    return c.json({ error: "Invalid domain" }, 400);
  }

  try {
    // HEADリクエストで存在確認（軽量）
    const response = await fetch(url, { method: "HEAD" });

    // 404のみ「存在しない」と判定
    if (response.status === 404) {
      return c.json({ exists: false });
    }

    // 200-299は確実に存在
    if (response.ok) {
      return c.json({ exists: true });
    }

    // HEAD非対応サーバー（405等）や一時的エラー（403, 500等）の場合、
    // GETで再確認して誤検知を防ぐ
    const getResponse = await fetch(url, { method: "GET" });
    return c.json({ exists: getResponse.status !== 404 });
  } catch {
    // ネットワークエラー・タイムアウトは「存在する」として扱う
    // 誤って翻訳なし判定→DB永続化される誤検知を防ぐ
    return c.json({ exists: true });
  }
});
