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
      <div className="flex min-h-0 flex-1 animate-pulse flex-col bg-gray-100 px-6 pt-6 pb-6">
        {/* タイトル */}
        <div className="mb-6 h-8 w-48 shrink-0 rounded bg-gray-200" />

        {/* 本文行 */}
        <div className="min-h-0 flex-1 space-y-3 overflow-hidden">
          {/* 段落1 */}
          <SkeletonLine width="w-full" />
          <SkeletonLine width="w-11/12" />
          <SkeletonLine width="w-full" />
          <SkeletonLine width="w-9/12" />
          <div className="h-4" /> {/* 段落間スペース */}
          {/* 段落2 */}
          <SkeletonLine width="w-full" />
          <SkeletonLine width="w-10/12" />
          <SkeletonLine width="w-full" />
          <SkeletonLine width="w-7/12" />
          <div className="h-4" /> {/* 段落間スペース */}
          {/* 段落3 */}
          <SkeletonLine width="w-full" />
          <SkeletonLine width="w-full" />
          <SkeletonLine width="w-10/12" />
          <SkeletonLine width="w-full" />
          <SkeletonLine width="w-8/12" />
          <div className="h-4" /> {/* 段落間スペース */}
          {/* 段落4 */}
          <SkeletonLine width="w-full" />
          <SkeletonLine width="w-11/12" />
          <SkeletonLine width="w-full" />
          <SkeletonLine width="w-full" />
          <SkeletonLine width="w-6/12" />
          <div className="h-4" /> {/* 段落間スペース */}
          {/* 段落5 */}
          <SkeletonLine width="w-full" />
          <SkeletonLine width="w-10/12" />
          <SkeletonLine width="w-full" />
          <SkeletonLine width="w-9/12" />
        </div>
      </div>
    </div>
  );
}

function SkeletonLine({ width }: { width: string }) {
  return <div className={cn("h-4 rounded bg-gray-200", width)} />;
}
