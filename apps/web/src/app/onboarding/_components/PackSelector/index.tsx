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
    <div className="flex min-h-screen flex-col p-4" data-testid="pack-selector-skeleton">
      <div className="mb-6">
        <div className="h-4 w-16 animate-pulse rounded bg-gray-700" />
        <div className="mt-2 h-6 w-48 animate-pulse rounded bg-gray-700" />
      </div>
      <div className="flex flex-1 flex-col gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-800" />
        ))}
      </div>
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
    <div className="flex min-h-screen flex-col items-center justify-center p-4 text-white">
      <p className="mb-4 text-red-400">{message}</p>
      <div className="flex gap-4">
        <button onClick={onBack} className="rounded-lg bg-gray-700 px-4 py-2 hover:bg-gray-600">
          戻る
        </button>
        <button onClick={onRetry} className="rounded-lg bg-blue-600 px-4 py-2 hover:bg-blue-500">
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
    <div className="flex min-h-screen flex-col p-4 text-white" data-testid="pack-selector">
      <header className="mb-6">
        <button onClick={onBack} className="text-gray-400 hover:text-gray-200">
          ← 戻る
        </button>
        <h1 className="mt-2 text-xl font-bold">スターターパックを選ぶ</h1>
      </header>

      <div className="flex flex-1 flex-col gap-4">
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
      </div>

      {confirmError && (
        <div className="mt-4 text-sm text-red-400">
          選択に失敗しました。もう一度お試しください。
        </div>
      )}

      <footer className="mt-6">
        <button
          onClick={() => {
            void handleConfirm();
          }}
          disabled={!selectedPack || isConfirming}
          className="w-full rounded-lg bg-blue-600 py-3 text-white disabled:opacity-50"
        >
          {isConfirming ? "設定中..." : "始める"}
        </button>
      </footer>
    </div>
  );
}
