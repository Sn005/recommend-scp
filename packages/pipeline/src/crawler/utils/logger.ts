/**
 * ロガーユーティリティ
 * Subtask: 003-02-04
 *
 * pinoベースの構造化ロギング。
 * GitHub Actions対応（warn/errorは ::warning::/::error:: 形式で出力）。
 */
import pino from "pino";

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

const VALID_LEVELS: LogLevel[] = ["debug", "info", "warn", "error"];

/**
 * 環境変数からログレベルを取得
 */
const getLogLevelFromEnv = (): LogLevel | undefined => {
  const envLevel = process.env.LOG_LEVEL?.toLowerCase().trim();
  if (envLevel && VALID_LEVELS.includes(envLevel as LogLevel)) {
    return envLevel as LogLevel;
  }
  return undefined;
};

/**
 * GitHub Actions環境かどうかを判定
 */
const isGitHubActions = (): boolean => {
  return process.env.GITHUB_ACTIONS === "true" || process.env.GITHUB_ACTIONS === "1";
};

/**
 * GitHub Actions用のログフォーマッタを作成
 */
const createGitHubActionsHook = () => {
  return {
    logMethod(inputArgs: Parameters<pino.LogFn>, method: pino.LogFn, level: number) {
      // 通常のログ出力
      method.apply(this, inputArgs);

      // warn/errorの場合はGitHub Actions形式でも出力
      if (level >= 40) {
        const message =
          typeof inputArgs[0] === "string"
            ? inputArgs[0]
            : typeof inputArgs[1] === "string"
              ? inputArgs[1]
              : "";

        if (message) {
          const prefix = level >= 50 ? "::error::" : "::warning::";
          process.stdout.write(`${prefix}${message}\n`);
        }
      }
    },
  };
};

/**
 * ロガーを作成
 * @param options ロガーオプション
 */
export const createLogger = (options: LoggerOptions = {}): Logger => {
  const { prefix = "", level, silent = false } = options;

  // レベルの優先順位: オプション > 環境変数 > デフォルト（info）
  const effectiveLevel = silent ? "silent" : (level ?? getLogLevelFromEnv() ?? "info");

  const pinoOptions: pino.LoggerOptions = {
    level: effectiveLevel,
  };

  // GitHub Actions環境ではhookを追加
  if (isGitHubActions()) {
    pinoOptions.hooks = createGitHubActionsHook();
  }

  const pinoInstance = pino(pinoOptions);

  /**
   * ログ出力のラッパー
   * contextオブジェクトとErrorオブジェクトを適切に処理
   */
  const log = (pinoMethod: pino.LogFn, message: string, args: unknown[]): void => {
    // contextオブジェクトを構築
    const context: Record<string, unknown> = {};

    // prefixがあれば追加
    if (prefix) {
      context.prefix = prefix;
    }

    // 引数を処理
    for (const arg of args) {
      if (arg instanceof Error) {
        // Errorオブジェクトはerrプロパティとして追加
        context.err = {
          message: arg.message,
          stack: arg.stack,
          name: arg.name,
          ...Object.fromEntries(
            Object.entries(arg).filter(([key]) => !["message", "stack", "name"].includes(key))
          ),
        };
      } else if (typeof arg === "object" && arg !== null) {
        // オブジェクトはcontextにマージ
        Object.assign(context, arg);
      }
    }

    // ログ出力
    if (Object.keys(context).length > 0) {
      pinoMethod.call(pinoInstance, context, message);
    } else {
      pinoMethod.call(pinoInstance, message);
    }
  };

  return {
    debug: (message: string, ...args: unknown[]) => {
      log(pinoInstance.debug, message, args);
    },
    info: (message: string, ...args: unknown[]) => {
      log(pinoInstance.info, message, args);
    },
    warn: (message: string, ...args: unknown[]) => {
      log(pinoInstance.warn, message, args);
    },
    error: (message: string, ...args: unknown[]) => {
      log(pinoInstance.error, message, args);
    },
  };
};

/** デフォルトのクローラーロガー */
export const crawlerLogger = createLogger({ prefix: "[Crawler]" });
