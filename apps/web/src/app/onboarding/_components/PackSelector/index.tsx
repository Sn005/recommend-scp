"use client";

export interface PackSelectorProps {
  visitorId: string;
  onComplete: () => void;
  onBack: () => void;
}

/**
 * パック選択コンポーネント（スタブ）
 *
 * 006-01-02 で実装予定
 */
export function PackSelector({ onBack }: PackSelectorProps) {
  return (
    <div
      data-testid="pack-selector"
      className="flex min-h-screen flex-col items-center justify-center p-4"
    >
      <h2 className="mb-8 text-2xl font-bold text-white">スターターパックを選択</h2>
      <p className="mb-8 text-gray-300">（実装予定）</p>
      <button
        onClick={onBack}
        className="rounded-lg border border-gray-600 bg-gray-800 px-4 py-2 text-white transition-colors hover:bg-gray-700"
      >
        戻る
      </button>
    </div>
  );
}
