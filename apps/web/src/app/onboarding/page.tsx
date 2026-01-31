"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useVisitorId } from "@/shared/hooks/useVisitorId";
import { useOnboarding } from "./_hooks/useOnboarding";
import { OnboardingSelect } from "./_components/OnboardingSelect";
import { PackSelector } from "./_components/PackSelector";
import { ScpNumberInput } from "./_components/ScpNumberInput";

/**
 * ローディングインジケーター
 */
function LoadingIndicator() {
  return (
    <div
      data-testid="loading-indicator"
      className="flex min-h-screen flex-col items-center justify-center p-4"
      role="status"
      aria-label="読み込み中"
    >
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-600 border-t-white" />
      <p className="mt-4 text-gray-300">読み込み中...</p>
    </div>
  );
}

/**
 * エラーメッセージ
 */
function ErrorMessage({ error, onRetry }: { error: Error; onRetry: () => void }) {
  return (
    <div
      data-testid="error-message"
      className="flex min-h-screen flex-col items-center justify-center p-4"
    >
      <h1 className="mb-4 text-2xl font-bold text-red-400">エラーが発生しました</h1>
      <p className="mb-8 text-gray-300">{error.message}</p>
      <button
        onClick={onRetry}
        className="rounded-lg bg-primary px-6 py-2 font-medium text-white transition-colors hover:bg-primary/90"
      >
        リトライ
      </button>
    </div>
  );
}

/**
 * オンボーディングページ
 *
 * 新規ユーザー向けの初回設定フロー。
 * - 選択肢表示（スターターパック or カスタム入力）
 * - 各選択に応じたコンポーネント表示
 * - オンボーディング完了済みの場合は /reader にリダイレクト
 */
export default function OnboardingPage() {
  const router = useRouter();
  const { visitorId, isLoading: isVisitorLoading, isOnboarded, error } = useVisitorId();
  const { step, setStep, goBack } = useOnboarding();

  // AC-3: オンボーディング完了済みならリダイレクト
  useEffect(() => {
    if (!isVisitorLoading && isOnboarded) {
      router.replace("/reader");
    }
  }, [isVisitorLoading, isOnboarded, router]);

  // AC-6: ローディング状態
  if (isVisitorLoading) {
    return <LoadingIndicator />;
  }

  // AC-7: エラー状態
  if (error) {
    return (
      <ErrorMessage
        error={error}
        onRetry={() => {
          window.location.reload();
        }}
      />
    );
  }

  // AC-3: オンボーディング完了済みの場合は何も表示しない（リダイレクト中）
  if (isOnboarded) {
    return null;
  }

  // visitorIdがnullの場合は何も表示しない（エラーまたはローディング中）
  if (!visitorId) {
    return null;
  }

  // ステップに応じたコンポーネント表示
  switch (step) {
    case "select":
      // AC-1: 選択肢表示
      return (
        <OnboardingSelect
          onSelectPack={() => {
            setStep("pack");
          }}
          onSelectCustom={() => {
            setStep("custom");
          }}
        />
      );
    case "pack":
      // AC-4: パック選択コンポーネント
      return (
        <PackSelector
          visitorId={visitorId}
          onComplete={() => {
            router.push("/reader");
          }}
          onBack={goBack}
        />
      );
    case "custom":
      // AC-5: SCP番号入力コンポーネント
      return (
        <ScpNumberInput
          visitorId={visitorId}
          onComplete={() => {
            router.push("/reader");
          }}
          onBack={goBack}
        />
      );
  }
}
