/**
 * キャッシュヘルパー
 * Subtask: 016-01-01
 *
 * Redisを使った汎用キャッシュ操作を提供する。
 * Redis未設定時・エラー時はgraceful degradationで動作する。
 */

import { getRedisClient } from "./redis";
import { logger } from "./logger";

const redis = getRedisClient();

/**
 * キャッシュからデータを取得する
 * @returns キャッシュされた値、またはミス/エラー/未設定時は null
 */
export const cacheGet = async <T>(key: string): Promise<T | null> => {
  if (!redis) return null;
  try {
    return await redis.get<T>(key);
  } catch (error) {
    logger.error({ err: error, key }, "Redisキャッシュ取得エラー");
    return null;
  }
};

/**
 * キャッシュにデータを保存する
 * @param key キャッシュキー
 * @param value 保存する値
 * @param ttlSeconds TTL（秒）
 */
export const cacheSet = async (key: string, value: unknown, ttlSeconds: number): Promise<void> => {
  if (!redis) return;
  try {
    await redis.set(key, value, { ex: ttlSeconds });
  } catch (error) {
    logger.error({ err: error, key }, "Redisキャッシュ保存エラー");
  }
};

/**
 * キャッシュからキーを削除する（invalidation用）
 * Redis未設定時・エラー時は何もしない（graceful degradation）。
 */
export const cacheDelete = async (key: string): Promise<void> => {
  if (!redis) return;
  try {
    await redis.del(key);
  } catch (error) {
    logger.error({ err: error, key }, "Redisキャッシュ削除エラー");
  }
};
