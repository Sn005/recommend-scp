/**
 * @file 共通エラークラス
 * @description RFC 7807 Problem Details形式に対応したエラークラス群
 */

/**
 * 基底エラークラス
 *
 * RFC 7807 Problem Details形式のエラーレスポンスを生成可能。
 */
export class AppError extends Error {
  constructor(
    public readonly type: string,
    public readonly title: string,
    public readonly status: number,
    public readonly detail?: string,
    public readonly instance?: string
  ) {
    super(detail ?? title);
    this.name = "AppError";
  }

  /**
   * Problem Details形式に変換
   */
  toProblemDetails = () => ({
    type: this.type,
    title: this.title,
    status: this.status,
    detail: this.detail,
    instance: this.instance,
  });
}

/**
 * リソース未発見エラー
 *
 * 指定されたリソースが存在しない場合に使用。
 * HTTPステータス: 404 Not Found
 */
export class NotFoundError extends AppError {
  constructor(resource: string, id: string, instance?: string) {
    super(
      "https://recommend-scp.dev/errors/not-found",
      "Resource Not Found",
      404,
      `${resource} with id '${id}' not found`,
      instance
    );
    this.name = "NotFoundError";
  }
}

/**
 * バリデーションエラー
 *
 * 入力値が不正な場合に使用。
 * HTTPステータス: 400 Bad Request
 */
export class ValidationError extends AppError {
  constructor(detail: string, instance?: string) {
    super(
      "https://recommend-scp.dev/errors/validation",
      "Validation Failed",
      400,
      detail,
      instance
    );
    this.name = "ValidationError";
  }
}
