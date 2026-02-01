"use client";

import { usePackSelector } from "./usePackSelector";
import { PackCard } from "./PackCard";

export interface PackSelectorProps {
  visitorId: string;
  onComplete: () => void;
  onBack: () => void;
}

function PackSelectorSkeleton() {
  return (
    <div className="flex min-h-screen flex-col" data-testid="pack-selector-skeleton">
      {/* ヘッダー部分 */}
      <header className="border-b border-gray-100 bg-white">
        <div className="px-6 pb-6 pt-12">
          <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
          <div className="mt-2 h-4 w-64 animate-pulse rounded bg-gray-200" />
        </div>
      </header>
      {/* パック一覧部分 */}
      <main className="flex-1 space-y-3 px-4 py-6">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-2xl bg-white shadow-sm" />
        ))}
      </main>
    </div>
  );
}

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
  onBack: () => void;
}

function ErrorState({ message, onRetry, onBack }: ErrorStateProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <p className="mb-4 text-red-500">{message}</p>
      <div className="flex gap-4">
        <button
          onClick={onBack}
          className="rounded-lg bg-gray-200 px-4 py-2 text-gray-800 hover:bg-gray-300"
        >
          戻る
        </button>
        <button
          onClick={onRetry}
          className="rounded-lg bg-primary px-4 py-2 text-white hover:bg-primary/90"
        >
          リトライ
        </button>
      </div>
    </div>
  );
}

/**
 * パック選択コンポーネント
 *
 * スターターパックの一覧を表示し、ユーザーが選択できる
 */
export function PackSelector({ visitorId, onComplete, onBack }: PackSelectorProps) {
  const {
    packs,
    isLoadingPacks,
    packsError,
    selectedPack,
    selectPack,
    confirmSelection,
    isConfirming,
    confirmError,
    retryLoadPacks,
  } = usePackSelector(visitorId);

  const handleConfirm = async () => {
    try {
      await confirmSelection();
      onComplete();
    } catch {
      // エラーはhook内で処理
    }
  };

  if (isLoadingPacks) {
    return <PackSelectorSkeleton />;
  }

  if (packsError) {
    return (
      <ErrorState
        message="パック一覧の取得に失敗しました"
        onRetry={retryLoadPacks}
        onBack={onBack}
      />
    );
  }

  return (
    <div className="flex min-h-screen flex-col" data-testid="pack-selector">
      {/* ヘッダー */}
      <header className="border-b border-gray-100 bg-white">
        <div className="px-6 pb-6 pt-12">
          <button
            onClick={onBack}
            className="mb-4 text-sm text-gray-500 hover:text-gray-700"
            aria-label="← 戻る"
          >
            ← 戻る
          </button>
          <h1 className="text-2xl font-bold text-gray-800">スターターパックを選ぶ</h1>
          <p className="mt-2 text-gray-500">好みに近いパックを選んでください</p>
        </div>
      </header>

      {/* パック一覧 */}
      <main className="flex-1 space-y-3 px-4 py-6 pb-28">
        {packs.map((pack) => (
          <PackCard
            key={pack.type}
            pack={pack}
            isSelected={selectedPack?.type === pack.type}
            onSelect={() => {
              selectPack(pack);
            }}
            disabled={isConfirming}
          />
        ))}
      </main>

      {/* エラーメッセージ */}
      {confirmError && (
        <div className="fixed bottom-24 left-4 right-4 rounded-lg bg-red-50 p-3 text-center text-sm text-red-500">
          選択に失敗しました。もう一度お試しください。
        </div>
      )}

      {/* 開始ボタン（固定フッター） */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-gray-50 via-gray-50 p-4">
        <button
          onClick={() => {
            void handleConfirm();
          }}
          disabled={!selectedPack || isConfirming}
          className="w-full rounded-full bg-primary py-4 text-lg font-semibold text-white shadow-lg shadow-primary/40 transition-all disabled:bg-gray-300 disabled:shadow-none"
        >
          {isConfirming ? "設定中..." : "推薦を開始"}
        </button>
      </div>
    </div>
  );
}
