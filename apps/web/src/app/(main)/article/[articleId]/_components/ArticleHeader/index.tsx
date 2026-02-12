/**
 * @file ArticleHeader コンポーネント
 * @description 記事閲覧ページのヘッダー（戻るボタンのみ）
 */
"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/shared/lib/utils";
import { Icon } from "@/shared/components/ui/Icon";

/**
 * 記事閲覧ヘッダー
 *
 * - 左: 戻るボタン（chevron-left）→ ブラウザバック
 * - グラスモーフィズムで半透明背景
 */
export function ArticleHeader() {
  const router = useRouter();

  const handleBack = () => {
    router.back();
  };

  return (
    <header
      data-testid="article-header"
      className={cn(
        "fixed top-0 left-0 right-0 z-40",
        "flex items-center",
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
    </header>
  );
}
