import { pino, type Logger } from "pino";

// eslint-disable-next-line n/no-process-env -- logger設定のため許可
const LOG_LEVEL = process.env.LOG_LEVEL ?? "info";
// eslint-disable-next-line n/no-process-env -- logger設定のため許可
const NODE_ENV = process.env.NODE_ENV ?? "development";

// pino-prettyはテスト・本番環境では無効化
const usePrettyPrint = NODE_ENV === "development";

export const logger: Logger = pino({
  level: LOG_LEVEL,
  transport: usePrettyPrint
    ? {
        target: "pino-pretty",
        options: { colorize: true },
      }
    : undefined,
});
