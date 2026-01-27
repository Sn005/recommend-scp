import type { ProblemDetails } from "./problem-details";

const BASE_URI = "https://recommend-scp.dev/errors";

/**
 * アプリケーションエラーの基底クラス
 * RFC 7807 Problem Details形式に変換可能
 */
export class AppError extends Error {
  constructor(
    public readonly type: string,
    public readonly title: string,
    public readonly status: number,
    public readonly detail?: string,
    public readonly instance?: string
  ) {
    super(title);
    this.name = this.constructor.name;
  }

  toProblemDetails(): ProblemDetails {
    return {
      type: this.type,
      title: this.title,
      status: this.status,
      detail: this.detail,
      instance: this.instance,
    };
  }
}

/**
 * リソースが見つからない場合のエラー
 * @example new NotFoundError("Visitor", "abc-123")
 */
export class NotFoundError extends AppError {
  constructor(resourceType: string, id: string) {
    super(
      `${BASE_URI}/not-found`,
      "Resource Not Found",
      404,
      `${resourceType} with id '${id}' not found`
    );
  }
}

/**
 * バリデーションエラー
 * @example new ValidationError("At least 3 articles must be selected")
 */
export class ValidationError extends AppError {
  constructor(message: string) {
    super(`${BASE_URI}/validation-error`, "Validation Error", 400, message);
  }
}

/**
 * オンボーディング未完了エラー
 * @example new OnboardingRequiredError("abc-123")
 */
export class OnboardingRequiredError extends AppError {
  constructor(visitorId: string) {
    super(
      `${BASE_URI}/onboarding-required`,
      "Onboarding Required",
      403,
      `Visitor '${visitorId}' has not completed onboarding`
    );
  }
}
