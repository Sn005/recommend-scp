import { serve } from "@hono/node-server";
import { env } from "@recommend-scp/shared/lib/env";
import { getSupabaseClient } from "@recommend-scp/shared/lib/supabase";
import { pino } from "pino";
import { createApp } from "./app";

const logger = pino({
  level: "info",
});

const port = env.API_PORT;

logger.info({ port }, "APIサーバーを起動します");

const supabase = getSupabaseClient();
const app = createApp(supabase);

serve({
  fetch: app.fetch,
  port,
});

logger.info({ port }, "APIサーバーが起動しました");
