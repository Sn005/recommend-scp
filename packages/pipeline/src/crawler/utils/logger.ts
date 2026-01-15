/**
 * ロガーユーティリティ
 * Subtask: 003-02-02
 *
 * 現在はconsole.logのラッパーとして実装。
 * 将来的にpinoに置き換え予定（003-02-04で対応予定）。
 */

/** ログレベル */
export type LogLevel = "debug" | "info" | "warn" | "error";

/** ロガーインターフェース */
export interface Logger {
  debug: (message: string, ...args: unknown[]) => void;
  info: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, ...args: unknown[]) => void;
}

/** ロガーオプション */
export interface LoggerOptions {
  /** プレフィックス（例: "[Crawler]"） */
  prefix?: string;
  /** ログレベル（デフォルト: "info"） */
  level?: LogLevel;
  /** ログ出力を無効化（テスト用） */
  silent?: boolean;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * ロガーを作成
 * @param options ロガーオプション
 */
export const createLogger = (options: LoggerOptions = {}): Logger => {
  const { prefix = "", level = "info", silent = false } = options;

  const shouldLog = (targetLevel: LogLevel): boolean => {
    if (silent) return false;
    return LOG_LEVELS[targetLevel] >= LOG_LEVELS[level];
  };

  const formatMessage = (message: string): string => {
    return prefix ? `${prefix} ${message}` : message;
  };

  return {
    debug: (message: string, ...args: unknown[]) => {
      if (shouldLog("debug")) {
        // eslint-disable-next-line no-console
        console.debug(formatMessage(message), ...args);
      }
    },
    info: (message: string, ...args: unknown[]) => {
      if (shouldLog("info")) {
        // eslint-disable-next-line no-console
        console.log(formatMessage(message), ...args);
      }
    },
    warn: (message: string, ...args: unknown[]) => {
      if (shouldLog("warn")) {
        // eslint-disable-next-line no-console
        console.warn(formatMessage(message), ...args);
      }
    },
    error: (message: string, ...args: unknown[]) => {
      if (shouldLog("error")) {
        // eslint-disable-next-line no-console
        console.error(formatMessage(message), ...args);
      }
    },
  };
};

/** デフォルトのクローラーロガー */
export const crawlerLogger = createLogger({ prefix: "[Crawler]" });
