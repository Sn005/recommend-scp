import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // プレビュー環境のみ認証を適用
  // eslint-disable-next-line n/no-process-env
  if (process.env.VERCEL_ENV !== "preview") {
    return NextResponse.next();
  }

  // 環境変数が未設定の場合はスキップ（安全側に倒す）
  // eslint-disable-next-line n/no-process-env
  const expectedUser = process.env.PREVIEW_AUTH_USER;
  // eslint-disable-next-line n/no-process-env
  const expectedPass = process.env.PREVIEW_AUTH_PASS;

  if (!expectedUser || !expectedPass) {
    return NextResponse.next();
  }

  // Authorization ヘッダを確認
  const authHeader = request.headers.get("authorization");

  if (!authHeader?.startsWith("Basic ")) {
    return new NextResponse("Authentication required", {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Basic realm="Preview"',
      },
    });
  }

  // Basic認証のデコード
  try {
    const base64Credentials = authHeader.split(" ")[1];
    const credentials = Buffer.from(base64Credentials, "base64").toString("utf-8");
    const [user, pass] = credentials.split(":");

    if (user === expectedUser && pass === expectedPass) {
      return NextResponse.next();
    }
  } catch {
    // デコード失敗
  }

  return new NextResponse("Invalid credentials", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Preview"',
    },
  });
}

export const config = {
  matcher: [
    /*
     * 以下を除く全てのパスにマッチ:
     * - _next/static (静的ファイル)
     * - _next/image (画像最適化)
     * - favicon.ico (ファビコン)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
