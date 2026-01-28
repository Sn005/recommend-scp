/**
 * ヘルスチェックエンドポイント
 *
 * サーバーの稼働状態を確認するためのエンドポイント。
 * 監視ツールやロードバランサーでのヘルスチェックに使用。
 *
 * Method chainingでルートを定義し、Hono RPC用の型推論を有効化
 */

import { Hono } from "hono";
import { getSupabaseClient } from "@recommend-scp/shared/lib/supabase";
import { logger } from "../lib/logger";

// パッケージバージョンを取得
const VERSION = "0.1.0";

interface HealthResponse {
  status: "ok" | "degraded";
  timestamp: string;
  version: string;
}

/**
 * GET /health
 *
 * ヘルスチェック
 *
 * Response:
 * - 200 OK: サーバー正常
 * - 503 Service Unavailable: DB接続不可
 */
export const healthRoutes = new Hono().get("/", async (c) => {
  const response: HealthResponse = {
    status: "ok",
    timestamp: new Date().toISOString(),
    version: VERSION,
  };

  // DB接続チェック
  try {
    const supabase = getSupabaseClient();
    const { error } = await supabase.from("scp_articles").select("id").limit(1);

    if (error) {
      logger.warn({ error: error.message }, "DB接続チェック失敗");
      response.status = "degraded";
      return c.json(response, 503);
    }
  } catch (err) {
    logger.error({ err }, "DB接続で例外発生");
    response.status = "degraded";
    return c.json(response, 503);
  }

  return c.json(response, 200);
});
