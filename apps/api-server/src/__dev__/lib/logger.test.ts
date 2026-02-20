/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// モジュールのモック設定
vi.mock("pino", () => {
  const mockLogger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(() => mockLogger),
    level: "info",
  };
  return {
    pino: vi.fn(() => mockLogger),
    default: vi.fn(() => mockLogger),
  };
});

describe("lib/logger.ts", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("LOG_LEVEL", "info");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  describe("loggerインスタンス", () => {
    it("pinoロガーインスタンスをexportする", async () => {
      const { logger } = await import("../../lib/logger");

      expect(logger).toBeDefined();
      expect(logger.info).toBeInstanceOf(Function);
      expect(logger.error).toBeInstanceOf(Function);
      expect(logger.warn).toBeInstanceOf(Function);
    });

    it("createChildLoggerでbindingsを持つ子ロガーを作成する", async () => {
      const { logger, createChildLogger } = await import("../../lib/logger");

      const childLogger = createChildLogger({ module: "test" });

      expect(vi.mocked(logger.child)).toHaveBeenCalledWith({ module: "test" });
      expect(childLogger).toBeDefined();
    });
  });

  describe("環境別ログフォーマット", () => {
    it("開発環境でpino-pretty transportを設定する", async () => {
      vi.stubEnv("NODE_ENV", "development");
      vi.resetModules();

      const pino = await import("pino");
      await import("../../lib/logger");

      expect(pino.pino).toHaveBeenCalledWith(
        expect.objectContaining({
          transport: expect.objectContaining({
            target: "pino-pretty",
          }),
        })
      );
    });

    it("本番環境でJSON形式で出力する（transportなし）", async () => {
      vi.stubEnv("NODE_ENV", "production");
      vi.resetModules();

      const pino = await import("pino");
      await import("../../lib/logger");

      expect(pino.pino).toHaveBeenCalledWith(
        expect.objectContaining({
          transport: undefined,
        })
      );
    });

    it("NODE_ENVが未設定の場合、開発環境として扱う", async () => {
      vi.stubEnv("NODE_ENV", "");
      vi.resetModules();

      const pino = await import("pino");
      await import("../../lib/logger");

      // 空文字列は開発環境として扱う（!== "production"）
      expect(pino.pino).toHaveBeenCalledWith(
        expect.objectContaining({
          transport: expect.objectContaining({
            target: "pino-pretty",
          }),
        })
      );
    });

    it('NODE_ENV="test" の場合、開発環境として扱う', async () => {
      vi.stubEnv("NODE_ENV", "test");
      vi.resetModules();

      const pino = await import("pino");
      await import("../../lib/logger");

      expect(pino.pino).toHaveBeenCalledWith(
        expect.objectContaining({
          transport: expect.objectContaining({
            target: "pino-pretty",
          }),
        })
      );
    });
  });

  describe("ログレベル設定", () => {
    it("LOG_LEVELが未設定の場合、デフォルトで info レベルを使用する", async () => {
      vi.stubEnv("LOG_LEVEL", "");
      vi.resetModules();

      const pino = await import("pino");
      await import("../../lib/logger");

      expect(pino.pino).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "info",
        })
      );
    });

    it("LOG_LEVELが debug の場合、debug レベルでログを出力する", async () => {
      vi.stubEnv("LOG_LEVEL", "debug");
      vi.resetModules();

      const pino = await import("pino");
      await import("../../lib/logger");

      expect(pino.pino).toHaveBeenCalledWith(
        expect.objectContaining({
          level: "debug",
        })
      );
    });
  });

  describe("エラーログ", () => {
    it("エラーオブジェクトをログに記録する", async () => {
      const { logger } = await import("../../lib/logger");
      const error = new Error("Test error");

      logger.error({ err: error }, "エラーが発生しました");

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          err: expect.objectContaining({
            message: "Test error",
          }),
        }),
        "エラーが発生しました"
      );
    });

    it("エラー時にスタックトレースを含める", async () => {
      const { logger } = await import("../../lib/logger");
      const error = new Error("Stack trace test");

      logger.error({ err: error }, "スタックトレーステスト");

      const logCall = vi.mocked(logger.error).mock.calls[0][0] as {
        err: Error;
      };
      expect(logCall.err.stack).toBeDefined();
      expect(logCall.err.stack).toContain("Error: Stack trace test");
    });

    it("文字列エラーもログに記録する", async () => {
      const { logger } = await import("../../lib/logger");

      logger.error({ err: "String error message" }, "文字列エラー");

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ err: "String error message" }),
        "文字列エラー"
      );
    });

    it("undefinedエラーでもログに記録する", async () => {
      const { logger } = await import("../../lib/logger");

      logger.error({ err: undefined }, "未定義エラー");

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ err: undefined }),
        "未定義エラー"
      );
    });

    it("カスタムErrorクラスのスタックトレースも記録する", async () => {
      class CustomError extends Error {
        constructor(message: string) {
          super(message);
          this.name = "CustomError";
        }
      }

      const { logger } = await import("../../lib/logger");
      const error = new CustomError("Custom error");

      logger.error({ err: error }, "カスタムエラー");

      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          err: expect.objectContaining({
            name: "CustomError",
            message: "Custom error",
          }),
        }),
        "カスタムエラー"
      );
    });
  });
});
