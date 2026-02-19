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

import { Hono } from "hono";
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
 * Hono app 生成（遅延初期化）
 *
 * Next.js のビルド時には環境変数が設定されていないため、
 * リクエスト時に初めてアプリを初期化する
 *
 * Next.js API Route は /api/* へのリクエストを処理するため、
 * Hono app に basePath('/api') を設定してパスを一致させる
 */
let cachedApp: ReturnType<typeof createHonoApp> | null = null;

const createHonoApp = () => {
  const supabase = getSupabaseClient();
  const honoApp = createApp(supabase);
  return new Hono().basePath("/api").route("/", honoApp);
};

const getApp = () => {
  cachedApp ??= createHonoApp();
  return cachedApp;
};

/**
 * Vercel Handler
 * リクエスト時に Hono app を取得し、handle() でラップして処理
 */
export const GET = (req: Request) => handle(getApp())(req);
export const POST = (req: Request) => handle(getApp())(req);
export const PUT = (req: Request) => handle(getApp())(req);
export const DELETE = (req: Request) => handle(getApp())(req);
export const PATCH = (req: Request) => handle(getApp())(req);

/**
 * Node.js Runtime指定
 *
 * Edge Runtimeが望ましいが、api-serverの依存（pino, find-up等）が
 * Node.js固有のため、現時点ではNode.js Runtimeを使用。
 * Edge Runtime対応は別Subtaskで対応予定。
 */
export const runtime = "nodejs";

/**
 * 動的レンダリングを強制
 *
 * Next.js 16のルートハンドラ最適化により、catch-all APIルートが
 * 静的に最適化される場合がある。POSTリクエストは通常動的だが、
 * 明示的にforce-dynamicを指定して2回目以降のリクエストでの
 * 404エラーを防止する。
 */
export const dynamic = "force-dynamic";
