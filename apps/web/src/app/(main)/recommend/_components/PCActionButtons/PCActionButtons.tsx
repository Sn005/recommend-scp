"use client";

import { Icon } from "@/shared/components/ui/Icon";

interface Props {
  isFavorited: boolean;
  onFavorite: () => void;
  onNext: () => void;
}

export function PCActionButtons({ isFavorited, onFavorite, onNext }: Props) {
  return (
    <div className="hidden md:flex fixed bottom-6 left-1/2 -translate-x-1/2 gap-3 justify-center z-nav">
      {/* お気に入りボタン */}
      <button
        type="button"
        onClick={onFavorite}
        aria-label={isFavorited ? "お気に入りから削除" : "お気に入りに追加"}
        className={`
          inline-flex items-center gap-2 px-7 py-3 rounded-xl text-[15px] font-medium border shadow-lg
          ${
            isFavorited
              ? "bg-red-50 text-red-500 border-red-500"
              : "bg-white text-gray-500 border-gray-200 md:hover:border-red-500 md:hover:text-red-500 md:hover:bg-red-50"
          }
        `}
      >
        <Icon name={isFavorited ? "heart-filled" : "heart"} size={20} />
        お気に入り
      </button>

      {/* 次の記事ボタン */}
      <button
        type="button"
        onClick={onNext}
        aria-label="次の記事へ"
        className="inline-flex items-center gap-2 px-7 py-3 rounded-xl text-[15px] font-medium bg-blue-500 text-white md:hover:bg-blue-600 shadow-lg"
      >
        次の記事へ
        <Icon name="chevron-right" size={20} />
      </button>
    </div>
  );
}
