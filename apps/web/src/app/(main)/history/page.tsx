/**
 * @file 閲覧履歴ページ
 * @description 閲覧履歴を一覧表示するページ
 * @see specs/010-ja-article-display/010-04-history-excerpt/010-04-01.md
 */
"use client";

import { useHistory } from "./_hooks/useHistory";
import { HistoryCard } from "./_components/HistoryCard";

/**
 * 閲覧履歴ページ
 *
 * AC-1: 画面レイアウト
 * - タイトル「閲覧履歴」と履歴件数を表示
 *
 * AC-2: 履歴一覧表示
 * - 各エントリにタイトルと本文冒頭が表示される
 * - 履歴がない場合は「まだ閲覧履歴がありません」と表示
 *
 * AC-5: スクロール
 * - タイトルはスクロールで消える（固定しない）
 */
export default function HistoryPage() {
  const { history } = useHistory();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー（AC-1, AC-5: 固定しない） */}
      <div className="p-4">
        <h1 className="text-lg font-semibold text-gray-800">閲覧履歴</h1>
        <p className="text-sm text-gray-400">{String(history.length)}件</p>
      </div>

      {/* 履歴一覧（AC-2） */}
      <div className="space-y-3 px-4 pb-4">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <p className="text-gray-400">まだ閲覧履歴がありません</p>
            <p className="text-sm text-gray-400 mt-1">記事を閲覧すると、ここに履歴が表示されます</p>
          </div>
        ) : (
          history.map((entry) => (
            <HistoryCard key={`${entry.scpNumber}-${entry.viewedAt}`} entry={entry} />
          ))
        )}
      </div>
    </div>
  );
}
