"use client";

import { useEffect, useState } from "react";
import { cn } from "@/shared/lib/utils";

export interface PillNavProps {
  onFavorite: () => void;
  onNext: () => void;
  isFavorited: boolean;
}

export const PillNav = ({ onFavorite, onNext, isFavorited }: PillNavProps) => {
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
      }, 300); // heartPopアニメーションの時間
      return () => {
        clearTimeout(timer);
      };
    }
  }, [shouldAnimate]);

  return (
    <nav
      className={cn(
        "flex items-center gap-6",
        "py-2 px-5",
        "bg-white/30 backdrop-blur-glass",
        "rounded-[50px]",
        "shadow-glass"
      )}
    >
      {/* お気に入りボタン */}
      <button
        type="button"
        onClick={onFavorite}
        aria-label={isFavorited ? "お気に入りから削除" : "お気に入りに追加"}
        className={cn(
          "w-12 h-12",
          "flex items-center justify-center",
          "rounded-full",
          "transition-transform active:scale-95"
        )}
      >
        <span
          className={cn(
            "text-[26px]",
            isFavorited ? "text-favorite" : "text-favorite-outline",
            shouldAnimate && "animate-heart-pop"
          )}
        >
          {isFavorited ? "\u2665" : "\u2661"}
        </span>
      </button>

      {/* 次へボタン */}
      <button
        type="button"
        onClick={onNext}
        aria-label="次の記事へ"
        className={cn(
          "w-12 h-12",
          "flex items-center justify-center",
          "rounded-full",
          "transition-transform active:scale-95"
        )}
      >
        <span className="text-[26px] text-primary">{"\u2192"}</span>
      </button>
    </nav>
  );
};
