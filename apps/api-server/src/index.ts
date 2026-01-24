import { serve } from "@hono/node-server";
import { env } from "@recommend-scp/shared/lib/env";
import { pino } from "pino";
import { app } from "./app";

const logger = pino({
  level: "info",
});

const port = env.API_PORT;

logger.info({ port }, "APIサーバーを起動します");

serve({
  fetch: app.fetch,
  port,
});

logger.info({ port }, "APIサーバーが起動しました");
