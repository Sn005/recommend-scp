/**
 * @file Hono API Routes for Vercel
 * @description Next.js API Routes経由でHono APIを提供
 *
 * ローカル環境: NEXT_PUBLIC_API_URL=http://localhost:3001 で直接api-serverに接続
 * Vercel環境: このroute.ts経由でHono APIを提供
 *
 * Note: Edge Runtimeが望ましいが、api-serverの依存（pino, find-up等）が
 * Node.js固有のため、現時点ではNode.js Runtimeを使用。
 *
 * @see specs/007-infra/007-02-auto-preview/007-02-02.md
 */

import { handle } from "hono/vercel";
import { createClient } from "@supabase/supabase-js";
import { createApp } from "@recommend-scp/api-server/app";

/**
 * Supabase クライアント初期化（Edge Runtime用）
 *
 * Edge Runtime では packages/shared/lib/env.ts が使用できないため、
 * process.env から直接環境変数を読み取る
 *
 * Note: Edge Runtime ファイルでは process.env の直接参照が許可される
 */
const getSupabaseClient = () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("SUPABASE_URL is not set");
  }
  if (!supabaseServiceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

/**
 * Hono app 生成
 * createApp は SupabaseClient を受け取り、全ルートが登録されたHonoアプリを返す
 */
const supabase = getSupabaseClient();
const app = createApp(supabase);

/**
 * Vercel Edge Handler
 * handle() で Hono app をラップし、Next.js API Routes互換のハンドラを生成
 */
export const GET = handle(app);
export const POST = handle(app);
export const PUT = handle(app);
export const DELETE = handle(app);
export const PATCH = handle(app);

/**
 * Node.js Runtime指定
 *
 * Edge Runtimeが望ましいが、api-serverの依存（pino, find-up等）が
 * Node.js固有のため、現時点ではNode.js Runtimeを使用。
 * Edge Runtime対応は別Subtaskで対応予定。
 */
export const runtime = "nodejs";
