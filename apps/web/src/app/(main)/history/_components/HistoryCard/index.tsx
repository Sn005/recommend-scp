/**
 * @file HistoryCard コンポーネント
 * @description 閲覧履歴カードのUI
 * @see specs/010-ja-article-display/010-04-history-excerpt/010-04-01.md
 */

import { formatRelativeTime } from "@/shared/lib/date";
import { ObjectClassBadge } from "@/shared/components/ui/ObjectClassBadge";
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
 * AC-4: UI表示
 * - タイトル下に excerpt が表示される
 * - グレーのテキストカラーで表示される
 * - 1行に収まるよう省略される
 *
 * AC-5: 空の excerpt
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
    <div className="p-4 border-b" data-testid="history-card">
      <div className="flex justify-between items-start">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold">{entry.scpNumber}</h3>
          <p className="text-sm truncate">{entry.title}</p>
          {/* AC-5: 空の excerpt は表示しない */}
          {entry.excerpt && (
            <p data-testid="excerpt" className="text-xs text-muted-foreground truncate">
              {entry.excerpt}
            </p>
          )}
        </div>
        {/* objectClassがある場合のみバッジを表示 */}
        {entry.objectClass && badgeVariant && (
          <ObjectClassBadge variant={badgeVariant} className="ml-2 flex-shrink-0">
            {entry.objectClass}
          </ObjectClassBadge>
        )}
      </div>
      <p className="text-xs text-muted-foreground mt-1">{formatRelativeTime(entry.viewedAt)}</p>
    </div>
  );
}
