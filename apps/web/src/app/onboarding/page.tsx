"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useVisitorId, ONBOARDING_COMPLETED_KEY } from "@/shared/hooks/useVisitorId";
import { PackSelector } from "./_components/PackSelector";
import { ScpNumberInput } from "./_components/ScpNumberInput";

type TabType = "pack" | "manual";

/**
 * タブボタンコンポーネント
 */
function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex-1 border-b-2 px-5 py-3 font-medium transition-all ${
        active ? "border-primary text-primary" : "border-transparent text-gray-400"
      }`}
    >
      {children}
    </button>
  );
}

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
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-primary" />
      <p className="mt-4 text-gray-500">読み込み中...</p>
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
      <h1 className="mb-4 text-2xl font-bold text-red-500">エラーが発生しました</h1>
      <p className="mb-8 text-gray-600">{error.message}</p>
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
 * useSearchParams()はSuspense境界内で使用する必要がある（Next.js要件）
 */
export default function OnboardingPage() {
  return (
    <Suspense fallback={<LoadingIndicator />}>
      <OnboardingPageContent />
    </Suspense>
  );
}

/**
 * オンボーディングページコンテンツ
 *
 * タブUIで「スターターパック」と「SCP番号を入力」を切り替え
 * - オンボーディング完了済みの場合は /recommend にリダイレクト
 */
function OnboardingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isReset = searchParams.get("reset") === "true";
  const { visitorId, isLoading: isVisitorLoading, isOnboarded, error } = useVisitorId();
  const [activeTab, setActiveTab] = useState<TabType>("pack");

  // 好みの再設定時はlocalStorageのオンボーディング完了フラグをクリア
  useEffect(() => {
    if (isReset) {
      localStorage.removeItem(ONBOARDING_COMPLETED_KEY);
    }
  }, [isReset]);

  // AC-3: オンボーディング完了済みならリダイレクト（再設定時はスキップ）
  useEffect(() => {
    if (!isReset && !isVisitorLoading && isOnboarded) {
      router.replace("/recommend");
    }
  }, [isReset, isVisitorLoading, isOnboarded, router]);

  // ローディング状態
  if (isVisitorLoading) {
    return <LoadingIndicator />;
  }

  // エラー状態
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

  // オンボーディング完了済みの場合は何も表示しない（リダイレクト中）（再設定時はスキップ）
  if (!isReset && isOnboarded) {
    return null;
  }

  // visitorIdがnullの場合は何も表示しない（エラーまたはローディング中）
  if (!visitorId) {
    return null;
  }

  const handleComplete = () => {
    router.push("/recommend");
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* ヘッダー */}
      <header className="border-b border-gray-100 bg-white">
        <div className="px-6 pb-6 pt-12">
          <h1 className="text-2xl font-bold text-gray-800">SCP Recommend</h1>
          <p className="mt-2 text-gray-500">あなたの好みに合わせたSCP記事を推薦します</p>
        </div>
        {/* タブ */}
        <div className="flex border-b border-gray-100" role="tablist">
          <TabButton
            active={activeTab === "pack"}
            onClick={() => {
              setActiveTab("pack");
            }}
          >
            スターターパック
          </TabButton>
          <TabButton
            active={activeTab === "manual"}
            onClick={() => {
              setActiveTab("manual");
            }}
          >
            SCP番号を入力
          </TabButton>
        </div>
      </header>

      {/* コンテンツ */}
      {activeTab === "pack" ? (
        <PackSelector visitorId={visitorId} onComplete={handleComplete} />
      ) : (
        <ScpNumberInput visitorId={visitorId} onComplete={handleComplete} />
      )}
    </div>
  );
}
