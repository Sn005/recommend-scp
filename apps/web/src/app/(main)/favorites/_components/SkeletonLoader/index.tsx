/**
 * @file SkeletonLoader コンポーネント
 * @description ローディング中のスケルトンUI
 * @see specs/006-frontend/006-03-favorites/006-03-01.md AC-6
 */

/**
 * スケルトンローダーコンポーネント
 *
 * AC-6:
 * - スケルトンローダーが表示される
 * - カード形状のプレースホルダーが3つ表示される
 */
export function SkeletonLoader() {
  return (
    <div data-testid="skeleton-loader" className="space-y-3">
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </div>
  );
}

/**
 * スケルトンカード
 */
function SkeletonCard() {
  return (
    <div data-testid="skeleton-card" className="bg-white rounded-xl shadow-sm p-4 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          {/* バッジと評価のスケルトン */}
          <div className="flex items-center gap-2 mb-2">
            <div className="h-5 w-12 rounded bg-gray-200" />
            <div className="h-4 w-10 rounded bg-gray-200" />
          </div>

          {/* タイトルのスケルトン */}
          <div className="h-5 w-3/4 rounded bg-gray-200 mb-2" />

          {/* 概要のスケルトン */}
          <div className="h-4 w-full rounded bg-gray-200" />
        </div>

        {/* 右矢印のスケルトン */}
        <div className="h-5 w-5 rounded bg-gray-200 flex-shrink-0" />
      </div>
    </div>
  );
}
