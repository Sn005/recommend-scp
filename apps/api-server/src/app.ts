import { Hono } from "hono";
import { getSupabaseClient } from "@recommend-scp/shared/lib/supabase";
import { corsMiddleware } from "./middleware/cors";
import { errorHandler } from "./middleware/error-handler";
import { healthRoutes } from "./routes/health";
import { createVisitorsRoutes } from "./domains/visitors/routes";

const app = new Hono();

// CORSミドルウェア（全ルートに適用）
app.use(corsMiddleware);

// RFC 7807 Problem Details形式のエラーハンドリング
app.onError(errorHandler);

// ヘルスチェックは認証・ログ不要
app.route("/health", healthRoutes);

// Visitors API
const supabase = getSupabaseClient();
app.route("/visitors", createVisitorsRoutes(supabase));

export { app };
export type AppType = typeof app;
