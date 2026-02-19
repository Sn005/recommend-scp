/**
 * @file SkeletonLoader コンポーネント
 * @description ローディング中のスケルトンUI（推薦画面の記事読み込み待ち表示）
 * @see specs/006-frontend/006-02-article-reader/006-02-01.md AC-1
 */

import { cn } from "@/shared/lib/utils";

/**
 * スケルトンローダーコンポーネント
 *
 * AC-1: ローディング中はスケルトンUIが表示される
 */
export function SkeletonLoader() {
  return (
    <div data-testid="skeleton-loader" className="flex h-screen w-full flex-col">
      {/* 記事エリアのスケルトン */}
      <div className="flex-1 animate-pulse bg-gray-100 p-6">
        {/* タイトル */}
        <div className="mb-6 h-8 w-48 rounded bg-gray-200" />

        {/* 本文行 */}
        <div className="space-y-3">
          <SkeletonLine width="w-full" />
          <SkeletonLine width="w-11/12" />
          <SkeletonLine width="w-full" />
          <SkeletonLine width="w-9/12" />
          <div className="h-4" /> {/* スペース */}
          <SkeletonLine width="w-full" />
          <SkeletonLine width="w-10/12" />
          <SkeletonLine width="w-full" />
          <SkeletonLine width="w-7/12" />
        </div>
      </div>

      {/* 下部UIのスケルトン */}
      <div className="fixed inset-x-0 bottom-0 z-nav flex flex-col items-center gap-3 pb-4">
        {/* PillNav スケルトン */}
        <div className="flex h-16 w-36 animate-pulse items-center justify-center gap-6 rounded-[50px] bg-gray-200/50" />
      </div>
    </div>
  );
}

function SkeletonLine({ width }: { width: string }) {
  return <div className={cn("h-4 rounded bg-gray-200", width)} />;
}
