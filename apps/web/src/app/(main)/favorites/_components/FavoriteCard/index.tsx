/**
 * @file FavoriteCard コンポーネント
 * @description お気に入り記事のカード表示
 * @see specs/006-frontend/006-03-favorites/006-03-02.md
 */
"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/shared/lib/utils";
import { ObjectClassBadge } from "@/shared/components/ui/ObjectClassBadge";
import { Icon } from "@/shared/components/ui/Icon";
import type { FavoriteArticle } from "../../_hooks/useFavorites";

/**
 * FavoriteCard Props
 */
export interface FavoriteCardProps {
  /** お気に入り記事データ */
  article: FavoriteArticle;
  /** 削除コールバック */
  onRemove: (articleId: string) => void;
  /** 削除中フラグ（フェードアウトアニメーション用） */
  isRemoving?: boolean;
}

/**
 * 評価を表示用にフォーマット
 * - 正数の場合は「+」を付与
 * - 3桁区切りにフォーマット
 */
function formatRating(rating: number | null): string | null {
  if (rating === null) return null;
  const prefix = rating >= 0 ? "+" : "";
  return `${prefix}${rating.toLocaleString()}`;
}

/**
 * objectClassを表示用にフォーマット（先頭大文字化）
 */
function formatObjectClass(objectClass: string | null): string | null {
  if (!objectClass) return null;
  return objectClass.charAt(0).toUpperCase() + objectClass.slice(1).toLowerCase();
}

/**
 * お気に入りカードコンポーネント
 *
 * AC-1: カード情報表示
 * - オブジェクトクラスバッジ、評価、タイトル
 *
 * AC-2: カードタップで遷移
 * - `/article/{articleId}` に遷移
 *
 * AC-3: 削除ボタン
 * - ×ボタンタップで `onRemove(articleId)` コールバック
 *
 * AC-4: 削除アニメーション
 * - 0.3秒でフェードアウト
 *
 * AC-6: 右矢印アイコン
 * - chevron-right、text-gray-300
 *
 * @param props - コンポーネントProps
 * @returns お気に入りカードコンポーネント
 *
 * @example
 * ```tsx
 * <FavoriteCard
 *   article={{
 *     id: "fav-1",
 *     articleId: "scp-173",
 *     title: "彫刻 - オリジナル",
 *     objectClass: "euclid",
 *     rating: 4102,
 *     favoritedAt: "2024-01-15T10:00:00.000Z",
 *   }}
 *   onRemove={(articleId) => handleRemove(articleId)}
 * />
 * ```
 */
export function FavoriteCard({ article, onRemove, isRemoving = false }: FavoriteCardProps) {
  const router = useRouter();

  const handleCardClick = () => {
    router.push(`/article/${encodeURIComponent(article.articleId)}`);
  };

  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // カードクリックを阻止
    onRemove(article.articleId);
  };

  const formattedRating = formatRating(article.rating);
  const formattedObjectClass = formatObjectClass(article.objectClass);

  return (
    <div
      data-testid="favorite-card"
      className={cn(
        "bg-white rounded-xl shadow-sm p-4 cursor-pointer",
        "transition-all duration-300",
        isRemoving && "opacity-0 scale-95"
      )}
      onClick={handleCardClick}
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

          {/* タイトル */}
          <h3 className="font-semibold text-gray-800">{article.title ?? ""}</h3>

          {/* 概要（AC-1） */}
          {article.excerpt && (
            <p className="text-sm text-gray-500 mt-1 line-clamp-1">{article.excerpt}</p>
          )}
        </div>

        {/* 削除ボタン */}
        <button
          onClick={handleRemoveClick}
          className="p-1 hover:bg-gray-100 rounded flex-shrink-0"
          aria-label="お気に入りから削除"
        >
          <Icon name="x" size={16} className="text-gray-400" />
        </button>

        {/* 右矢印アイコン */}
        <Icon name="chevron-right" size={20} className="text-gray-300 flex-shrink-0" />
      </div>
    </div>
  );
}
