import { Hono } from "hono";
import { corsMiddleware } from "./middleware/cors";
import { errorHandler } from "./middleware/error-handler";

const app = new Hono();

// CORSミドルウェア（全ルートに適用）
app.use(corsMiddleware);

// RFC 7807 Problem Details形式のエラーハンドリング
app.onError(errorHandler);

app.get("/health", (c) => {
  return c.json({ status: "ok" });
});

export { app };
export type AppType = typeof app;
