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
  c.header("X-Frame-Options", "DENY");
  c.header("X-XSS-Protection", "0");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
});
