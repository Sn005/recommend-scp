"use client";

interface PackSelectorProps {
  visitorId: string;
  onComplete: () => void;
  onBack: () => void;
}

/**
 * パック選択コンポーネント（スタブ）
 * 実装は 006-01-02 で完成させる
 */
export function PackSelector({ onBack }: PackSelectorProps) {
  return (
    <div
      data-testid="pack-selector"
      className="flex min-h-screen flex-col items-center justify-center p-4"
    >
      <h2 className="mb-8 text-xl font-bold text-white">スターターパックを選択</h2>
      <p className="mb-4 text-gray-400">（実装予定: 006-01-02）</p>
      <button
        data-testid="pack-selector-back"
        onClick={onBack}
        className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white hover:bg-gray-700"
      >
        戻る
      </button>
    </div>
  );
}
