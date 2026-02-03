/**
 * @file 履歴カードコンポーネント
 * @description 閲覧履歴の1件を表示するカード
 * @see specs/010-ja-article-display/010-04-history-excerpt/010-04-01.md
 */

"use client";

import { ObjectClassBadge } from "@/shared/components/ui/ObjectClassBadge";

import type { HistoryEntry } from "../../_types";

export interface HistoryCardProps {
  /** 履歴エントリ */
  entry: HistoryEntry;
  /** クリック時のコールバック */
  onClick?: () => void;
}

/**
 * 相対時間をフォーマットする
 * @param dateString ISO 8601形式の日時文字列
 * @returns 相対時間の文字列（例: "2時間前"）
 */
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) {
    return "たった今";
  }
  if (minutes < 60) {
    return `${String(minutes)}分前`;
  }
  if (hours < 24) {
    return `${String(hours)}時間前`;
  }
  if (days < 30) {
    return `${String(days)}日前`;
  }
  // 30日以上前は日付を表示
  return date.toLocaleDateString("ja-JP");
}

/**
 * 履歴カードコンポーネント
 * 閲覧履歴の1件を表示する
 *
 * @example
 * <HistoryCard
 *   entry={{
 *     scpNumber: "SCP-173",
 *     title: "彫刻 - オリジナル",
 *     excerpt: "アイテム番号: SCP-173 オブジェクトクラス: Euclid...",
 *     objectClass: "Euclid",
 *     viewedAt: "2024-01-01T00:00:00.000Z",
 *   }}
 *   onClick={() => console.log("clicked")}
 * />
 */
export function HistoryCard({ entry, onClick }: HistoryCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full border-b border-gray-200 p-4 text-left transition-colors hover:bg-gray-50"
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-gray-900">{entry.scpNumber}</h3>
          <p className="truncate text-sm text-gray-700">{entry.title}</p>
          {entry.excerpt && <p className="truncate text-xs text-gray-500">{entry.excerpt}</p>}
        </div>
        <ObjectClassBadge variant={entry.objectClass} className="ml-2 flex-shrink-0" />
      </div>
      <p className="mt-1 text-xs text-gray-500">{formatRelativeTime(entry.viewedAt)}</p>
    </button>
  );
}
