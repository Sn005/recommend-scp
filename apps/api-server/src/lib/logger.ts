import { pino, type Logger } from "pino";
import { env } from "@recommend-scp/shared/lib/env";

const isDevelopment = env.NODE_ENV !== "production";

export const logger: Logger = pino({
  level: env.LOG_LEVEL || "info",
  transport: isDevelopment
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "SYS:standard",
        },
      }
    : undefined,
});

export const createChildLogger = (bindings: Record<string, unknown>): Logger =>
  logger.child(bindings);
