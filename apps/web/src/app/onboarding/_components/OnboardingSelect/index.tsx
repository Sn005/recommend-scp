"use client";

interface OnboardingSelectProps {
  onSelectPack: () => void;
  onSelectCustom: () => void;
}

/**
 * オンボーディング選択画面
 *
 * ユーザーに2つの選択肢を提示する：
 * 1. スターターパックから選ぶ
 * 2. 好きなSCPを教える
 */
export function OnboardingSelect({ onSelectPack, onSelectCustom }: OnboardingSelectProps) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* ヘッダー */}
      <header className="border-b border-gray-100 bg-white">
        <div className="px-6 pb-6 pt-12">
          <h1 className="text-2xl font-bold text-gray-800">SCP Recommend</h1>
          <p className="mt-2 text-gray-500">あなたの好みに合わせたSCP記事を推薦します</p>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex flex-1 flex-col items-center justify-center p-6">
        <h2 className="mb-2 text-xl font-bold text-gray-800">ようこそ！</h2>
        <p className="mb-8 text-gray-500">どちらの方法で始めますか？</p>

        <div className="flex w-full max-w-sm flex-col gap-4">
          <button
            onClick={onSelectPack}
            className="rounded-2xl border-2 border-transparent bg-white p-4 text-left shadow-sm transition-all hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">📦</span>
              <div>
                <span className="font-semibold text-gray-800">スターターパックから選ぶ</span>
                <p className="text-sm text-gray-500">おすすめのSCPカテゴリから選択</p>
              </div>
            </div>
          </button>

          <button
            onClick={onSelectCustom}
            className="rounded-2xl border-2 border-transparent bg-white p-4 text-left shadow-sm transition-all hover:shadow-md"
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">✏️</span>
              <div>
                <span className="font-semibold text-gray-800">好きなSCPを教える</span>
                <p className="text-sm text-gray-500">お気に入りのSCP番号を入力</p>
              </div>
            </div>
          </button>
        </div>
      </main>
    </div>
  );
}
