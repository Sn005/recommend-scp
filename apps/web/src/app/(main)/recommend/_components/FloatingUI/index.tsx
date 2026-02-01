/**
 * @file FloatingUI コンポーネント（スタブ実装）
 * @description PillNav + ProgressBar をラップするフローティングUI
 * @see specs/006-frontend/006-02-article-reader/006-02-03.md
 *
 * TODO: 006-02-03 で本実装に置き換え
 */
"use client";

import { PillNav } from "@/shared/components/ui/PillNav";
import { ProgressBar } from "@/shared/components/ui/ProgressBar";

export interface FloatingUIProps {
  /** 進捗（0-100） */
  progress: number;
  /** お気に入り済み */
  isFavorited: boolean;
  /** お気に入りボタンクリック */
  onFavorite: () => void;
  /** 次へボタンクリック */
  onNext: () => void;
}

/**
 * フローティングUIコンポーネント
 *
 * 画面下部に固定表示されるPillNavとProgressBar
 */
export function FloatingUI({ progress, isFavorited, onFavorite, onNext }: FloatingUIProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-nav flex flex-col items-center gap-3 pb-8">
      <ProgressBar value={progress} className="w-48" data-testid="progress-bar" />
      <div data-testid="pill-nav">
        <PillNav isFavorited={isFavorited} onFavorite={onFavorite} onNext={onNext} />
      </div>
    </div>
  );
}
