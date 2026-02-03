/**
 * @file 閲覧履歴ページ
 * @description 閲覧したSCP記事の履歴を表示する
 * @see specs/010-ja-article-display/010-04-history-excerpt/010-04-01.md
 */

"use client";

import { useRouter } from "next/navigation";

import { HistoryCard } from "./_components/HistoryCard";
import { useHistory } from "./_hooks/useHistory";

export default function HistoryPage() {
  const router = useRouter();
  const { history, isLoading, clear } = useHistory();

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <p className="text-gray-600">読み込み中...</p>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold">閲覧履歴</h1>
        <p className="mt-2 text-gray-600">まだ記事を閲覧していません</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-4 py-3">
        <h1 className="text-xl font-bold">閲覧履歴</h1>
        <button type="button" onClick={clear} className="text-sm text-red-600 hover:text-red-700">
          すべて削除
        </button>
      </header>
      <main>
        {history.map((entry) => (
          <HistoryCard
            key={`${entry.scpNumber}-${entry.viewedAt}`}
            entry={entry}
            onClick={() => {
              router.push(`/recommend?scp=${entry.scpNumber}`);
            }}
          />
        ))}
      </main>
    </div>
  );
}
