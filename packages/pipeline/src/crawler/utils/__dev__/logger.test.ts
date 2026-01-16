/**
 * pinoロギングのテスト
 * Subtask: 003-02-04
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createLogger } from "../logger";

/** pinoログ出力の型定義 */
interface PinoLogOutput {
  time: number;
  level: number;
  msg: string;
  pid: number;
  hostname: string;
  prefix?: string;
  articleId?: string;
  lang?: string;
  err?: {
    message: string;
    stack?: string;
    name: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

// pinoモジュールを初期化（stdoutキャッシュを確立）
beforeAll(() => {
  const initLogger = createLogger({ silent: true });
  initLogger.info("init");
});

/**
 * 非同期ログ出力をキャプチャするヘルパー
 */
async function captureOutputAsync(fn: () => void): Promise<string> {
  const chunks: string[] = [];
  const originalWrite = process.stdout.write.bind(process.stdout);

  process.stdout.write = ((
    chunk: string | Uint8Array,
    encoding?: BufferEncoding | ((err?: Error) => void),
    callback?: (err?: Error) => void
  ): boolean => {
    if (typeof chunk === "string") {
      chunks.push(chunk);
    } else {
      chunks.push(chunk.toString());
    }
    if (typeof encoding === "function") {
      encoding();
    } else if (callback) {
      callback();
    }
    return true;
  }) as typeof process.stdout.write;

  try {
    fn();
    // pinoは非同期で出力するため、少し待つ
    await new Promise((resolve) => setTimeout(resolve, 50));
  } finally {
    process.stdout.write = originalWrite;
  }

  return chunks.join("");
}

/**
 * JSON出力をパースするヘルパー
 */
function parseLogOutput(output: string): PinoLogOutput {
  return JSON.parse(output.trim().split("\n")[0]) as PinoLogOutput;
}

describe("logger", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // 環境変数のクリーンアップ
    delete process.env.LOG_LEVEL;
    delete process.env.GITHUB_ACTIONS;
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("pino導入", () => {
    it("pinoが依存関係に含まれる", async () => {
      const pkg = await import("../../../../package.json");
      expect(pkg.dependencies).toHaveProperty("pino");
    });

    // Note: debugレベルの動作は「levelが正しく出力される」テストでカバー

    it("環境変数LOG_LEVELがinfoの場合、debugは出力されない", async () => {
      process.env.LOG_LEVEL = "info";
      const logger = createLogger();

      const output = await captureOutputAsync(() => {
        logger.debug("debugメッセージ");
      });

      expect(output).not.toContain("debugメッセージ");
    });

    it("環境変数LOG_LEVELがwarnの場合、infoは出力されない", async () => {
      process.env.LOG_LEVEL = "warn";
      const logger = createLogger();

      const output = await captureOutputAsync(() => {
        logger.info("infoメッセージ");
      });

      expect(output).not.toContain("infoメッセージ");
    });

    it("環境変数LOG_LEVELがerrorの場合、warnは出力されない", async () => {
      process.env.LOG_LEVEL = "error";
      const logger = createLogger();

      const output = await captureOutputAsync(() => {
        logger.warn("warnメッセージ");
      });

      expect(output).not.toContain("warnメッセージ");
    });

    it("LOG_LEVELが未設定の場合、デフォルト（info）で動作する", async () => {
      const logger = createLogger();

      const output = await captureOutputAsync(() => {
        logger.debug("debugメッセージ");
        logger.info("infoメッセージ");
      });

      expect(output).not.toContain("debugメッセージ");
      expect(output).toContain("infoメッセージ");
    });

    it("LOG_LEVELが大文字の場合、正規化されて動作する", async () => {
      process.env.LOG_LEVEL = "DEBUG";
      const logger = createLogger();

      const output = await captureOutputAsync(() => {
        logger.debug("debugテストメッセージ");
      });

      expect(output).toContain("debugテストメッセージ");
    });

    it("LOG_LEVELが不正な値の場合、デフォルトレベルで動作する", async () => {
      process.env.LOG_LEVEL = "invalid";
      const logger = createLogger();

      const output = await captureOutputAsync(() => {
        logger.debug("debugメッセージ");
        logger.info("infoメッセージ");
      });

      expect(output).not.toContain("debugメッセージ");
      expect(output).toContain("infoメッセージ");
    });
  });

  describe("構造化ログ", () => {
    it("ログがJSON形式で出力される", async () => {
      const logger = createLogger();

      const output = await captureOutputAsync(() => {
        logger.info("テストメッセージ");
      });

      // JSON形式かどうかをパースで確認
      const lines = output.trim().split("\n");
      expect(lines.length).toBeGreaterThan(0);
      expect(() => JSON.parse(lines[0]) as PinoLogOutput).not.toThrow();
    });

    it("timestampが含まれる", async () => {
      const logger = createLogger();

      const output = await captureOutputAsync(() => {
        logger.info("テストメッセージ");
      });

      const parsed = parseLogOutput(output);
      // pinoはtimeプロパティにUnixタイムスタンプを出力
      expect(parsed).toHaveProperty("time");
    });

    it("levelが正しく出力される", async () => {
      const logger = createLogger({ level: "debug" });

      const debugOutput = await captureOutputAsync(() => {
        logger.debug("debug");
      });
      const infoOutput = await captureOutputAsync(() => {
        logger.info("info");
      });
      const warnOutput = await captureOutputAsync(() => {
        logger.warn("warn");
      });
      const errorOutput = await captureOutputAsync(() => {
        logger.error("error");
      });

      expect(parseLogOutput(debugOutput)).toHaveProperty("level", 20); // pino debug level
      expect(parseLogOutput(infoOutput)).toHaveProperty("level", 30); // pino info level
      expect(parseLogOutput(warnOutput)).toHaveProperty("level", 40); // pino warn level
      expect(parseLogOutput(errorOutput)).toHaveProperty("level", 50); // pino error level
    });

    it("messageが正しく出力される", async () => {
      const logger = createLogger();

      const output = await captureOutputAsync(() => {
        logger.info("テストメッセージです");
      });

      const parsed = parseLogOutput(output);
      expect(parsed).toHaveProperty("msg", "テストメッセージです");
    });

    it("contextが追加情報として含まれる", async () => {
      const logger = createLogger();

      const output = await captureOutputAsync(() => {
        logger.info("記事取得", { articleId: "scp-173", lang: "en" });
      });

      const parsed = parseLogOutput(output);
      expect(parsed).toHaveProperty("articleId", "scp-173");
      expect(parsed).toHaveProperty("lang", "en");
    });

    it("Errorオブジェクトが渡された場合、スタックトレースも含まれる", async () => {
      const logger = createLogger();
      const error = new Error("テストエラー");

      const output = await captureOutputAsync(() => {
        logger.error("エラーが発生", error);
      });

      const parsed = parseLogOutput(output);
      expect(parsed).toHaveProperty("err");
      expect(parsed.err).toHaveProperty("message", "テストエラー");
      expect(parsed.err).toHaveProperty("stack");
      expect(parsed.err?.stack).toContain("Error: テストエラー");
    });

    it("messageが空文字の場合でもエラーにならない", async () => {
      const logger = createLogger();

      const output = await captureOutputAsync(() => {
        logger.info("");
      });

      expect(() => JSON.parse(output.trim().split("\n")[0]) as PinoLogOutput).not.toThrow();
    });

    it("messageに特殊文字が含まれる場合、エスケープされる", async () => {
      const logger = createLogger();

      const output = await captureOutputAsync(() => {
        logger.info('特殊文字: "引用符", \\バックスラッシュ, \n改行');
      });

      const parsed = parseLogOutput(output);
      expect(parsed.msg).toContain("特殊文字");
    });
  });

  describe("ラッパー移行", () => {
    it("既存インターフェースが維持される", () => {
      const logger = createLogger({ prefix: "[Test]" });

      expect(logger).toHaveProperty("debug");
      expect(logger).toHaveProperty("info");
      expect(logger).toHaveProperty("warn");
      expect(logger).toHaveProperty("error");
      expect(typeof logger.debug).toBe("function");
      expect(typeof logger.info).toBe("function");
      expect(typeof logger.warn).toBe("function");
      expect(typeof logger.error).toBe("function");
    });

    it("呼び出し側のコードは変更不要（エラーにならない）", () => {
      const logger = createLogger({ prefix: "[Test]" });

      expect(() => {
        logger.debug("debug");
        logger.info("info");
        logger.warn("warn");
        logger.error("error");
      }).not.toThrow();
    });

    it("silentオプションを指定した際、ログ出力が無効化される", async () => {
      const logger = createLogger({ silent: true });

      const output = await captureOutputAsync(() => {
        logger.debug("debug");
        logger.info("info");
        logger.warn("warn");
        logger.error("error");
      });

      expect(output).toBe("");
    });

    it("prefixが正しく適用される", async () => {
      const logger = createLogger({ prefix: "[Crawler]" });

      const output = await captureOutputAsync(() => {
        logger.info("テストメッセージ");
      });

      const parsed = parseLogOutput(output);
      expect(parsed).toHaveProperty("prefix", "[Crawler]");
    });

    it("prefixが空文字の場合、prefixプロパティが含まれない", async () => {
      const logger = createLogger({ prefix: "" });

      const output = await captureOutputAsync(() => {
        logger.info("テストメッセージ");
      });

      const parsed = parseLogOutput(output);
      expect(parsed.prefix).toBeUndefined();
    });

    it("オプションオブジェクトが空の場合、デフォルト設定で動作する", async () => {
      const logger = createLogger({});

      const output = await captureOutputAsync(() => {
        logger.info("テストメッセージ");
      });

      expect(output).toContain("テストメッセージ");
    });

    it("levelオプションが指定された場合、環境変数より優先される", async () => {
      process.env.LOG_LEVEL = "error";
      const logger = createLogger({ level: "debug" });

      const output = await captureOutputAsync(() => {
        logger.debug("debugメッセージ");
      });

      expect(output).toContain("debugメッセージ");
    });
  });

  describe("GitHub Actions対応", () => {
    it("GitHub Actions環境で実行された際、ログがworkflowログに出力される", async () => {
      process.env.GITHUB_ACTIONS = "true";
      const logger = createLogger();

      const output = await captureOutputAsync(() => {
        logger.info("テストメッセージ");
      });

      expect(output).toContain("テストメッセージ");
    });

    it("warnログがGitHub Actionsの警告形式で出力される", async () => {
      process.env.GITHUB_ACTIONS = "true";
      const logger = createLogger();

      const output = await captureOutputAsync(() => {
        logger.warn("警告メッセージ");
      });

      expect(output).toContain("::warning::");
    });

    it("errorログがGitHub Actionsのエラー形式で出力される", async () => {
      process.env.GITHUB_ACTIONS = "true";
      const logger = createLogger();

      const output = await captureOutputAsync(() => {
        logger.error("エラーメッセージ");
      });

      expect(output).toContain("::error::");
    });

    it("GITHUB_ACTIONSが未設定の場合、通常のJSON形式で出力される", async () => {
      const logger = createLogger();

      const output = await captureOutputAsync(() => {
        logger.warn("警告メッセージ");
      });

      expect(output).not.toContain("::warning::");
      expect(() => JSON.parse(output.trim().split("\n")[0]) as PinoLogOutput).not.toThrow();
    });
  });

  describe("crawlerLogger（デフォルトインスタンス）", () => {
    it("prefixが[Crawler]でエクスポートされる", async () => {
      // モジュールキャッシュをクリアして再インポート
      vi.resetModules();
      const { crawlerLogger } = await import("../logger");

      const output = await captureOutputAsync(() => {
        crawlerLogger.info("テストメッセージ");
      });

      const lines = output.trim().split("\n").filter(Boolean);
      expect(lines.length).toBeGreaterThan(0);
      const parsed = JSON.parse(lines[0]) as PinoLogOutput;
      expect(parsed).toHaveProperty("prefix", "[Crawler]");
    });
  });
});
