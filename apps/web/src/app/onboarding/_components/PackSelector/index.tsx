"use client";

import { usePackSelector } from "./usePackSelector";
import { PackCard } from "./PackCard";

export interface PackSelectorProps {
  visitorId: string;
  onComplete: () => void;
}

function PackSelectorSkeleton() {
  return (
    <>
      <main className="flex-1 space-y-3 px-4 py-6 pb-28" data-testid="pack-selector-skeleton">
        <div className="mb-4 h-4 w-64 animate-pulse rounded bg-gray-200" />
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-2xl bg-white shadow-sm" />
        ))}
      </main>
      {/* 開始ボタン（固定フッター） */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-gray-50 via-gray-50 p-4">
        <button
          disabled
          className="w-full rounded-full bg-gray-300 py-4 text-lg font-semibold text-white"
        >
          推薦を開始
        </button>
      </div>
    </>
  );
}

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-4">
      <p className="mb-4 text-red-500">{message}</p>
      <button
        onClick={onRetry}
        className="rounded-lg bg-primary px-4 py-2 text-white hover:bg-primary/90"
      >
        リトライ
      </button>
    </div>
  );
}

/**
 * パック選択コンポーネント
 *
 * スターターパックの一覧を表示し、ユーザーが複数選択できる
 */
export function PackSelector({ visitorId, onComplete }: PackSelectorProps) {
  const {
    packs,
    isLoadingPacks,
    packsError,
    selectedPacks,
    togglePack,
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
    return <ErrorState message="パック一覧の取得に失敗しました" onRetry={retryLoadPacks} />;
  }

  const canStart = selectedPacks.size > 0;

  return (
    <>
      {/* パック一覧 */}
      <main className="flex-1 space-y-3 px-4 py-6 pb-28" data-testid="pack-selector">
        <p className="mb-4 text-sm text-gray-500">好みに近いパックを選んでください（複数選択可）</p>
        {packs.map((pack) => (
          <PackCard
            key={pack.type}
            pack={pack}
            isSelected={selectedPacks.has(pack.type)}
            onSelect={() => {
              togglePack(pack.type);
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
          disabled={!canStart || isConfirming}
          className="w-full rounded-full bg-primary py-4 text-lg font-semibold text-white shadow-lg shadow-primary/40 transition-all disabled:bg-gray-300 disabled:shadow-none"
        >
          {isConfirming ? "設定中..." : "推薦を開始"}
        </button>
      </div>
    </>
  );
}
