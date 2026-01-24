import type { ErrorHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";
import { createProblemDetails } from "../lib/problem-details";
import { logger as defaultLogger } from "../lib/logger";

/**
 * ロガーインターフェース（テスト用DI）
 */
export interface Logger {
  info: (obj: unknown, msg: string) => void;
  warn: (obj: unknown, msg: string) => void;
  error: (obj: unknown, msg: string) => void;
  debug: (obj: unknown, msg: string) => void;
}

/**
 * HTTPステータスコードに応じたデフォルトメッセージ
 */
const HTTP_STATUS_MESSAGES: Record<number, string> = {
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  405: "Method Not Allowed",
  409: "Conflict",
  422: "Unprocessable Entity",
  429: "Too Many Requests",
  500: "Internal Server Error",
  502: "Bad Gateway",
  503: "Service Unavailable",
};

/**
 * RFC 7807 Problem Details形式のエラーハンドラーを作成
 * Hono の app.onError() で使用する
 */
export const createErrorHandler = (logger: Logger = defaultLogger): ErrorHandler => {
  return (error, c) => {
    // ZodError: バリデーションエラー
    if (error instanceof ZodError) {
      const detail = error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");

      return c.json(
        createProblemDetails("VALIDATION_ERROR", "Validation Error", 400, detail, c.req.path),
        400,
        { "Content-Type": "application/problem+json" }
      );
    }

    // HTTPException: Honoの標準例外
    if (error instanceof HTTPException) {
      const status = error.status;
      const title = error.message || HTTP_STATUS_MESSAGES[status] || "Error";

      // ステータスコードに応じたエラータイプを決定
      const errorType = status === 404 ? "NOT_FOUND" : "INTERNAL_ERROR";

      return c.json(createProblemDetails(errorType, title, status, undefined, c.req.path), status, {
        "Content-Type": "application/problem+json",
      });
    }

    // 予期しないエラー: 500 Internal Server Error
    logger.error({ err: error, path: c.req.path }, "Unexpected error");

    return c.json(
      createProblemDetails("INTERNAL_ERROR", "Internal Server Error", 500, undefined, c.req.path),
      500,
      { "Content-Type": "application/problem+json" }
    );
  };
};

/**
 * デフォルトエラーハンドラー（通常使用）
 * app.onError(errorHandler) として使用
 */
export const errorHandler = createErrorHandler();
