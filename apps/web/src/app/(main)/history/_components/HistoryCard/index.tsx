/**
 * @file HistoryCard コンポーネント
 * @description 閲覧履歴カードのUI
 * @see specs/006-frontend/006-04-history/006-04-03.md
 */

import Link from "next/link";
import { formatRelativeTime } from "@/shared/lib/date";
import { ObjectClassBadge } from "@/shared/components/ui/ObjectClassBadge";
import { Icon } from "@/shared/components/ui/Icon";
import type { HistoryEntry } from "../../_types";

/**
 * HistoryCard Props
 */
export interface HistoryCardProps {
  /** 履歴エントリ */
  entry: HistoryEntry;
}

/**
 * 履歴カードコンポーネント
 *
 * AC-1: カードタップで記事詳細画面に遷移
 * AC-2: タップフィードバック（scale: 0.98）
 *
 * UI表示:
 * - タイトル下に excerpt が表示される
 * - グレーのテキストカラーで表示される
 * - 1行に収まるよう省略される
 * - excerpt が空の場合は表示しない
 *
 * @param props - コンポーネントProps
 * @returns 履歴カードコンポーネント
 *
 * @example
 * ```tsx
 * <HistoryCard
 *   entry={{
 *     scpNumber: "scp-173",
 *     title: "彫刻 - オリジナル",
 *     excerpt: "アイテム番号: SCP-173",
 *     objectClass: "Euclid",
 *     viewedAt: "2024-01-15T10:00:00.000Z",
 *   }}
 * />
 * ```
 */
export function HistoryCard({ entry }: HistoryCardProps) {
  const badgeVariant = entry.objectClass?.toLowerCase() as
    | "safe"
    | "euclid"
    | "keter"
    | "thaumiel"
    | "neutralized"
    | undefined;

  return (
    <Link
      href={`/article/${encodeURIComponent(entry.scpNumber)}`}
      className="block bg-white rounded-xl shadow-sm p-4 transition-transform active:scale-[0.98]"
      data-testid="history-card"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {/* objectClassがある場合のみバッジを表示 */}
            {entry.objectClass && badgeVariant && (
              <ObjectClassBadge variant={badgeVariant} className="flex-shrink-0">
                {entry.objectClass}
              </ObjectClassBadge>
            )}
          </div>
          <h3 className="font-semibold text-gray-800">{entry.scpNumber}</h3>
          <p className="text-sm text-gray-500 truncate">{entry.title}</p>
          {/* 空の excerpt は表示しない */}
          {entry.excerpt && (
            <p data-testid="excerpt" className="text-xs text-gray-400 truncate mt-1">
              {entry.excerpt}
            </p>
          )}
          <p className="text-xs text-gray-400 mt-1">{formatRelativeTime(entry.viewedAt)}</p>
        </div>

        {/* 右矢印アイコン */}
        <Icon name="chevron-right" size={20} className="text-gray-300 flex-shrink-0 mt-2" />
      </div>
    </Link>
  );
}
