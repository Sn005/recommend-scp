import { Hono } from "hono";
import { getSupabaseClient } from "@recommend-scp/shared/lib/supabase";
import { corsMiddleware } from "./middleware/cors";
import { errorHandler } from "./middleware/error-handler";
import { healthRoutes } from "./routes/health";
import { createVisitorsRoutes } from "./domains/visitors/routes";
import { createArticlesRoutes } from "./domains/articles/routes";
import { createRecommendRoutes } from "./domains/recommend/routes";
import { createOnboardingRoutes } from "./domains/onboarding/routes";

const app = new Hono();

// CORSミドルウェア（全ルートに適用）
app.use(corsMiddleware);

// RFC 7807 Problem Details形式のエラーハンドリング
app.onError(errorHandler);

// ヘルスチェックは認証・ログ不要
app.route("/health", healthRoutes);

// Supabaseクライアント（各ドメインで共有）
const supabase = getSupabaseClient();

// Visitors API
app.route("/visitors", createVisitorsRoutes(supabase));

// Articles API
app.route("/articles", createArticlesRoutes(supabase));

// Recommend API
app.route("/recommend", createRecommendRoutes(supabase));

// Onboarding API
app.route("/onboarding", createOnboardingRoutes(supabase));

export { app };
export type AppType = typeof app;
