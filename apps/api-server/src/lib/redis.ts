/**
 * Redisクライアント初期化
 * Subtask: 016-01-01
 *
 * Upstash Redis への接続を管理する。
 * 環境変数未設定時は null を返す（graceful degradation）。
 */

import { Redis } from "@upstash/redis";
import { env } from "@recommend-scp/shared/lib/env";

/**
 * Redisクライアントを取得する
 * @returns Redis インスタンス、または環境変数未設定時は null
 */
export const getRedisClient = (): Redis | null => {
  const url = env.UPSTASH_REDIS_REST_URL;
  const token = env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
};
