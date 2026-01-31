/**
 * RFC 7807 Problem Details形式
 */
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
}

/**
 * APIレスポンスをProblemDetailsとしてパース
 */
export async function parseApiError(response: Response): Promise<ProblemDetails> {
  try {
    const json = (await response.json()) as Record<string, unknown>;
    return {
      type: typeof json.type === "string" ? json.type : "https://recommend-scp.dev/errors/unknown",
      title: typeof json.title === "string" ? json.title : "Unknown Error",
      status: response.status,
      detail: typeof json.detail === "string" ? json.detail : undefined,
      instance: typeof json.instance === "string" ? json.instance : undefined,
    };
  } catch {
    return {
      type: "https://recommend-scp.dev/errors/parse-error",
      title: "Response Parse Error",
      status: response.status,
      detail: "Failed to parse error response",
    };
  }
}

/**
 * APIエラーかどうかを判定
 */
export function isApiError(error: unknown): error is ProblemDetails {
  return (
    typeof error === "object" &&
    error !== null &&
    "type" in error &&
    "title" in error &&
    "status" in error
  );
}

/**
 * ユーザー向けエラーメッセージを取得
 */
export function getErrorMessage(error: ProblemDetails): string {
  // 既知のエラータイプに対するメッセージマッピング
  const messages: Record<string, string> = {
    "https://recommend-scp.dev/errors/not-found": "リソースが見つかりませんでした",
    "https://recommend-scp.dev/errors/validation-error": "入力内容に問題があります",
    "https://recommend-scp.dev/errors/internal-error": "サーバーエラーが発生しました",
  };

  if (error.type in messages) {
    return messages[error.type];
  }
  if (error.detail) {
    return error.detail;
  }
  return error.title;
}
