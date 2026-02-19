/**
 * @file HistoryCard コンポーネント
 * @description 閲覧履歴カードのUI（お気に入りカードと同一レイアウト）
 * @see specs/006-frontend/006-04-history/006-04-03.md
 */

import Link from "next/link";
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
 * 評価を表示用にフォーマット
 * - 正数の場合は「+」を付与
 * - 3桁区切りにフォーマット
 */
function formatRating(rating: number | null | undefined): string | null {
  if (rating === null || rating === undefined) return null;
  const prefix = rating >= 0 ? "+" : "";
  return `${prefix}${rating.toLocaleString()}`;
}

/**
 * objectClassを表示用にフォーマット（先頭大文字化）
 */
function formatObjectClass(objectClass: string | null | undefined): string | null {
  if (!objectClass) return null;
  return objectClass.charAt(0).toUpperCase() + objectClass.slice(1).toLowerCase();
}

/**
 * 履歴カードコンポーネント
 *
 * 表示項目: SCPナンバー、オブジェクトクラス、スター数
 * お気に入りカードと同一のUIレイアウト
 *
 * AC-1: カードタップで記事詳細画面に遷移
 * AC-2: タップフィードバック（scale: 0.98）
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
 *     excerpt: "",
 *     objectClass: "Euclid",
 *     rating: 4102,
 *     viewedAt: "2024-01-15T10:00:00.000Z",
 *   }}
 * />
 * ```
 */
export function HistoryCard({ entry }: HistoryCardProps) {
  const formattedRating = formatRating(entry.rating);
  const formattedObjectClass = formatObjectClass(entry.objectClass);

  return (
    <Link
      href={`/article/${encodeURIComponent(entry.scpNumber)}`}
      className="block bg-white rounded-xl shadow-sm p-4 transition-transform active:scale-[0.98]"
      data-testid="history-card"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          {/* バッジと評価 */}
          <div className="flex items-center gap-2 mb-1">
            {formattedObjectClass && (
              <ObjectClassBadge variant={formattedObjectClass}>
                {formattedObjectClass}
              </ObjectClassBadge>
            )}
            {formattedRating && <span className="text-xs text-gray-400">{formattedRating}</span>}
          </div>

          {/* SCPナンバー */}
          <h3 className="font-semibold text-gray-800">{entry.scpNumber}</h3>
        </div>

        {/* 右矢印アイコン */}
        <Icon name="chevron-right" size={20} className="text-gray-300 flex-shrink-0 mt-2" />
      </div>
    </Link>
  );
}
