/**
 * @file ArticleHeader コンポーネント
 * @description 記事閲覧ページのヘッダー（戻るボタン + お気に入りトグル）
 */
"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/shared/lib/utils";
import { Icon } from "@/shared/components/ui/Icon";
import { useArticleFavorite } from "@/shared/hooks/useArticleFavorite";

interface ArticleHeaderProps {
  /** 記事ID */
  articleId: string;
}

/**
 * 記事閲覧ヘッダー
 *
 * - 左: 戻るボタン（chevron-left）→ ブラウザバック
 * - 右: お気に入りトグル（heart / heart-filled）
 * - グラスモーフィズムで半透明背景
 */
export function ArticleHeader({ articleId }: ArticleHeaderProps) {
  const router = useRouter();
  const { isFavorited, toggleFavorite } = useArticleFavorite({
    articleId,
    initialFavorited: false,
  });

  const handleBack = () => {
    router.back();
  };

  const handleFavorite = () => {
    void toggleFavorite();
  };

  return (
    <header
      data-testid="article-header"
      className={cn(
        "fixed top-0 left-0 right-0 z-40",
        "flex items-center justify-between",
        "px-3 py-2",
        "bg-white/70 backdrop-blur-glass",
        "shadow-sm"
      )}
    >
      {/* 戻るボタン */}
      <button
        type="button"
        onClick={handleBack}
        aria-label="戻る"
        className={cn(
          "w-10 h-10",
          "flex items-center justify-center",
          "rounded-full",
          "hover:bg-black/5",
          "transition-colors"
        )}
      >
        <Icon name="chevron-left" size={24} className="text-gray-700" />
      </button>

      {/* お気に入りトグル */}
      <button
        type="button"
        onClick={handleFavorite}
        aria-label={isFavorited ? "お気に入りから削除" : "お気に入りに追加"}
        className={cn(
          "w-10 h-10",
          "flex items-center justify-center",
          "rounded-full",
          "hover:bg-black/5",
          "transition-colors"
        )}
      >
        <Icon
          name={isFavorited ? "heart-filled" : "heart"}
          size={22}
          className={isFavorited ? "text-favorite" : "text-favorite-outline"}
        />
      </button>
    </header>
  );
}
