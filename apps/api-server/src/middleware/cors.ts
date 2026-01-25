/**
 * CORSミドルウェア
 * Subtask: 005-01-04
 *
 * クロスオリジンリクエストを許可するCORS設定を実装する。
 * 環境変数 ALLOWED_ORIGINS でオリジンを制御（未設定時は localhost:3000）
 */

import { cors } from "hono/cors";
import { env } from "@recommend-scp/shared/lib/env";

/**
 * 許可オリジンを取得
 * - ALLOWED_ORIGINS が設定されている場合: カンマ区切りでパース
 * - 未設定の場合: localhost:3000 を許可（開発環境デフォルト）
 */
const getAllowedOrigins = (): string[] => {
  const allowedOrigins = env.ALLOWED_ORIGINS;
  if (allowedOrigins) {
    return allowedOrigins.split(",").map((o) => o.trim());
  }
  // 開発環境のデフォルト
  return ["http://localhost:3000"];
};

/**
 * CORSミドルウェア
 * - Methods: GET, POST, PUT, DELETE, OPTIONS を許可
 * - Headers: Content-Type, X-Visitor-Id, Authorization を許可
 * - Credentials: true（将来のAuth対応）
 * - MaxAge: 86400秒（24時間）
 */
export const corsMiddleware = cors({
  origin: getAllowedOrigins(),
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "X-Visitor-Id", "Authorization"],
  credentials: true,
  maxAge: 86400,
});
