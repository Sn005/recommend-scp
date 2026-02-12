"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useVisitorId } from "@/shared/hooks/useVisitorId";

interface OnboardingGuardProps {
  children: React.ReactNode;
}

/**
 * オンボーディング完了をチェックし、未完了の場合はリダイレクトするガードコンポーネント
 *
 * AC-2: 初回訪問リダイレクト
 * - visitorIdが未登録またはオンボーディング未完了の場合、/onboarding にリダイレクト
 */
export function OnboardingGuard({ children }: OnboardingGuardProps) {
  const router = useRouter();
  const { isLoading, isOnboarded, error } = useVisitorId();

  useEffect(() => {
    // ローディング中またはエラー時はリダイレクトしない
    if (isLoading || error) {
      return;
    }

    // オンボーディング未完了の場合はリダイレクト
    if (!isOnboarded) {
      router.replace("/onboarding");
    }
  }, [isLoading, isOnboarded, error, router]);

  // エラー時はエラー表示（オンボーディングに進めないため）
  if (error) {
    return (
      <div
        data-testid="main-error-message"
        className="flex min-h-screen flex-col items-center justify-center p-4"
      >
        <h1 className="mb-4 text-2xl font-bold text-red-400">エラーが発生しました</h1>
        <p className="mb-8 text-gray-300">{error.message}</p>
        <button
          onClick={() => {
            window.location.reload();
          }}
          className="rounded-lg bg-primary px-6 py-2 font-medium text-white transition-colors hover:bg-primary/90"
        >
          リトライ
        </button>
      </div>
    );
  }

  // ローディング完了後、オンボーディング未完了の場合は何も表示しない（リダイレクト中）
  if (!isLoading && !isOnboarded) {
    return null;
  }

  return <>{children}</>;
}
