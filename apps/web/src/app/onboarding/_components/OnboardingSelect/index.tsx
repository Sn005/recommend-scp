"use client";

interface OnboardingSelectProps {
  onSelectPack: () => void;
  onSelectCustom: () => void;
}

export function OnboardingSelect({ onSelectPack, onSelectCustom }: OnboardingSelectProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <h1 className="mb-8 text-2xl font-bold text-white">ようこそ！</h1>
      <p className="mb-8 text-gray-400">どちらの方法で始めますか？</p>

      <div className="flex w-full max-w-sm flex-col gap-4">
        <button
          onClick={onSelectPack}
          className="rounded-lg border border-gray-700 bg-gray-800 p-4 text-left transition hover:bg-gray-700"
        >
          <span className="text-lg text-white">スターターパックから選ぶ</span>
          <p className="mt-1 text-sm text-gray-400">おすすめのSCPカテゴリから選択</p>
        </button>

        <button
          onClick={onSelectCustom}
          className="rounded-lg border border-gray-700 bg-gray-800 p-4 text-left transition hover:bg-gray-700"
        >
          <span className="text-lg text-white">好きなSCPを教える</span>
          <p className="mt-1 text-sm text-gray-400">お気に入りのSCP番号を入力</p>
        </button>
      </div>
    </div>
  );
}
