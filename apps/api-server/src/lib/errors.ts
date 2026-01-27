/**
 * @file アプリケーション固有のエラークラス
 * @description RFC 7807 Problem Detailsと連携するカスタムエラー
 * @see specs/005-backend-api/005-01-api-base/005-01-06.md
 */

/**
 * リソースが見つからない場合のエラー
 *
 * @example
 * throw new NotFoundError("Visitor", "abc-123");
 * // Error message: "Visitor not found: abc-123"
 */
export class NotFoundError extends Error {
  constructor(
    public readonly resource: string,
    public readonly id: string
  ) {
    super(`${resource} not found: ${id}`);
    this.name = "NotFoundError";
  }
}

/**
 * オンボーディングが未完了の場合のエラー
 *
 * @example
 * throw new OnboardingRequiredError("visitor-123");
 * // Error message: "Onboarding required for visitor: visitor-123"
 */
export class OnboardingRequiredError extends Error {
  constructor(public readonly visitorId: string) {
    super(`Onboarding required for visitor: ${visitorId}`);
    this.name = "OnboardingRequiredError";
  }
}
