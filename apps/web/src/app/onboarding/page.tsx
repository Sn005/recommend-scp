"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useVisitorId, ONBOARDING_COMPLETED_KEY } from "@/shared/hooks/useVisitorId";
import { PackSelector } from "./_components/PackSelector";
import { ScpNumberInput } from "./_components/ScpNumberInput";

type TabType = "pack" | "manual";

/**
 * オンボーディング画面専用スケルトン
 *
 * ヘッダー + タブ + パック一覧のレイアウトを模したスケルトンUI
 */
function OnboardingSkeleton() {
  return (
    <div data-testid="onboarding-skeleton" className="flex min-h-screen flex-col bg-gray-50">
      {/* ヘッダースケルトン */}
      <header className="border-b border-gray-100 bg-white">
        <div className="px-6 pb-6 pt-12">
          <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
          <div className="mt-3 h-4 w-72 animate-pulse rounded bg-gray-200" />
        </div>
        {/* タブスケルトン */}
        <div className="flex border-b border-gray-100">
          <div className="flex-1 border-b-2 border-gray-200 px-5 py-3">
            <div className="mx-auto h-4 w-28 animate-pulse rounded bg-gray-200" />
          </div>
          <div className="flex-1 border-b-2 border-transparent px-5 py-3">
            <div className="mx-auto h-4 w-28 animate-pulse rounded bg-gray-200" />
          </div>
        </div>
      </header>

      {/* パック一覧スケルトン */}
      <main className="flex-1 space-y-3 px-4 py-6 pb-28">
        <div className="mb-4 h-4 w-64 animate-pulse rounded bg-gray-200" />
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="w-full rounded-2xl border-2 border-transparent bg-white p-4 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 flex-shrink-0 animate-pulse rounded-full bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-28 animate-pulse rounded bg-gray-200" />
                <div className="h-3 w-48 animate-pulse rounded bg-gray-200" />
              </div>
            </div>
          </div>
        ))}
      </main>

      {/* 開始ボタンスケルトン */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-gray-50 via-gray-50 p-4">
        <div className="h-14 w-full animate-pulse rounded-full bg-gray-200" />
      </div>
    </div>
  );
}

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
    <Suspense fallback={<OnboardingSkeleton />}>
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
    return <OnboardingSkeleton />;
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
          <h1 className="text-2xl font-bold text-gray-800">SCPピック</h1>
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
