/**
 * @file FloatingFavoriteButton コンポーネント
 * @description 記事閲覧ページの右下フローティングお気に入りボタン
 */
"use client";

import { useEffect, useState } from "react";
import { cn } from "@/shared/lib/utils";
import { Icon } from "@/shared/components/ui/Icon";
import { useArticleFavorite } from "@/shared/hooks/useArticleFavorite";

interface FloatingFavoriteButtonProps {
  /** 記事ID */
  articleId: string;
}

/**
 * フローティングお気に入りボタン
 *
 * - 画面右下に固定表示
 * - グラスモーフィズムの円形ボタン
 * - ハートアイコン + ポップアニメーション
 * - APIからお気に入り状態を動的に取得
 * - デザイントークン準拠: nav-button-size(48px), glassmorphism
 */
export function FloatingFavoriteButton({ articleId }: FloatingFavoriteButtonProps) {
  const { isFavorited, toggleFavorite } = useArticleFavorite({
    articleId,
  });

  const [shouldAnimate, setShouldAnimate] = useState(false);
  const [prevFavorited, setPrevFavorited] = useState(isFavorited);

  // isFavoritedがfalseからtrueに変化した時にアニメーションを発火
  if (isFavorited !== prevFavorited) {
    setPrevFavorited(isFavorited);
    if (!prevFavorited && isFavorited) {
      setShouldAnimate(true);
    }
  }

  // アニメーション終了後にフラグをリセット
  useEffect(() => {
    if (shouldAnimate) {
      const timer = setTimeout(() => {
        setShouldAnimate(false);
      }, 300);
      return () => {
        clearTimeout(timer);
      };
    }
  }, [shouldAnimate]);

  const handleFavorite = () => {
    void toggleFavorite();
  };

  return (
    <div data-testid="floating-favorite-button" className="fixed bottom-8 right-4 z-nav">
      <button
        type="button"
        onClick={handleFavorite}
        aria-label={isFavorited ? "お気に入りから削除" : "お気に入りに追加"}
        className={cn(
          "w-12 h-12",
          "flex items-center justify-center",
          "rounded-full",
          "bg-white/30 backdrop-blur-glass",
          "shadow-glass",
          "transition-transform active:scale-95"
        )}
      >
        <span className={cn(shouldAnimate && "animate-heart-pop")}>
          <Icon
            name={isFavorited ? "heart-filled" : "heart"}
            size={26}
            className={isFavorited ? "text-favorite" : "text-favorite-outline"}
          />
        </span>
      </button>
    </div>
  );
}
