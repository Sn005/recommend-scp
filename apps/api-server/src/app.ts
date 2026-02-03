/**
 * @file Hono アプリケーションファクトリ
 * @description 全APIエンドポイントを統合したHonoアプリケーションを生成
 *
 * Hono RPCの型推論を有効にするため、ルート定義のmethod chainingを分離。
 * createRoutes()で生成されたroutesの型をAppTypeとしてexportすることで、
 * フロントエンドでhc<AppType>による型安全なAPI呼び出しが可能になる。
 *
 * @see specs/005-backend-api/005-08-api-types/005-08-02.md
 */

import { Hono } from "hono";
import type { SupabaseClient } from "@supabase/supabase-js";
import { corsMiddleware } from "./middleware/cors";
import { errorHandler } from "./middleware/error-handler";
import { healthRoutes } from "./routes/health";
import { checkUrlRoutes } from "./routes/check-url";
import { createVisitorsRoutes } from "./domains/visitors/routes";
import { createArticlesRoutes } from "./domains/articles/routes";
import { createRecommendRoutes } from "./domains/recommend/routes";
import { createFeedbackRoutes } from "./domains/feedback/routes";
import { createOnboardingRoutes } from "./domains/onboarding/routes";

/**
 * APIルート定義ファクトリ
 *
 * Method chainingで全ルートを登録することで、TypeScriptが
 * 各エンドポイントの型情報を累積的に推論できる。
 *
 * NOTE: ミドルウェアは型推論に影響するため、ルート定義とは分離する
 *
 * @param supabase - SupabaseClient インスタンス
 * @returns 全ルートが登録されたHonoアプリケーション
 */
export const createRoutes = (supabase: SupabaseClient) => {
  return new Hono()
    .route("/health", healthRoutes)
    .route("/check-url", checkUrlRoutes)
    .route("/visitors", createVisitorsRoutes(supabase))
    .route("/articles", createArticlesRoutes(supabase))
    .route("/recommend", createRecommendRoutes(supabase))
    .route("/feedback", createFeedbackRoutes(supabase))
    .route("/onboarding", createOnboardingRoutes(supabase));
};

/**
 * AppType - Hono RPCクライアント用の型定義
 *
 * フロントエンドで以下のように使用:
 * ```typescript
 * import { hc } from 'hono/client';
 * import type { AppType } from '@recommend-scp/api-types';
 *
 * const client = hc<AppType>('http://localhost:3000');
 * const res = await client.visitors.$post({ json: { visitorId: 'xxx' } });
 * ```
 */
export type AppType = ReturnType<typeof createRoutes>;

/**
 * Honoアプリケーションファクトリ（ミドルウェア付き）
 *
 * @param supabase - SupabaseClient インスタンス
 * @returns ミドルウェアとエラーハンドラが適用されたHonoアプリケーション
 */
export const createApp = (supabase: SupabaseClient) => {
  const routes = createRoutes(supabase);

  const app = new Hono()
    // CORSミドルウェア（全ルートに適用）
    .use(corsMiddleware)
    // RFC 7807 Problem Details形式のエラーハンドリング
    .onError(errorHandler)
    // ルートをマウント
    .route("/", routes);

  return app;
};
