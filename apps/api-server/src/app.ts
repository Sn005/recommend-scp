import { Hono } from "hono";
import { errorHandler } from "./middleware/error-handler";

const app = new Hono();

// RFC 7807 Problem Details形式のエラーハンドリング
app.onError(errorHandler);

app.get("/health", (c) => {
  return c.json({ status: "ok" });
});

export { app };
export type AppType = typeof app;
