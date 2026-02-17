/**
 * セキュリティヘッダーミドルウェア
 * Subtask: 009-03-01
 *
 * 全APIレスポンスに標準的なセキュリティヘッダーを一括付与する。
 */

import { createMiddleware } from "hono/factory";

export const securityHeaders = createMiddleware(async (c, next) => {
  await next();
  c.header("X-Content-Type-Options", "nosniff");
  // wiki-proxyはiframe内で表示するためSAMEORIGIN、それ以外はDENY
  const frameOptions = c.req.path.includes("/wiki-proxy/") ? "SAMEORIGIN" : "DENY";
  c.header("X-Frame-Options", frameOptions);
  c.header("X-XSS-Protection", "0");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
});
