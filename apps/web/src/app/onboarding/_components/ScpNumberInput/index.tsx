"use client";

interface ScpNumberInputProps {
  visitorId: string;
  onComplete: () => void;
  onBack: () => void;
}

/**
 * SCP番号入力コンポーネント（スタブ）
 * 実装は 006-01-03 で完成させる
 */
export function ScpNumberInput({ onBack }: ScpNumberInputProps) {
  return (
    <div
      data-testid="scp-number-input"
      className="flex min-h-screen flex-col items-center justify-center p-4"
    >
      <h2 className="mb-8 text-xl font-bold text-white">好きなSCP番号を入力</h2>
      <p className="mb-4 text-gray-400">（実装予定: 006-01-03）</p>
      <button
        data-testid="scp-number-input-back"
        onClick={onBack}
        className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-white hover:bg-gray-700"
      >
        戻る
      </button>
    </div>
  );
}
