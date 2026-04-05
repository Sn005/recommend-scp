/**
 * @file お気に入りページ
 * @description お気に入り記事の一覧表示・管理ページ
 * @see specs/006-frontend/006-03-favorites/006-03-01.md
 */
"use client";

import { useFavorites } from "./_hooks/useFavorites";
import { FavoriteList } from "./_components/FavoriteList";
import { EmptyState } from "./_components/EmptyState";
import { ErrorState } from "./_components/ErrorState";
import { SkeletonLoader } from "./_components/SkeletonLoader";

/**
 * お気に入りページ
 *
 * AC-1: ページルーティング
 * - /favorites でページが表示される
 *
 * AC-2: ヘッダー表示
 * - 「お気に入り」タイトルと件数を表示
 * - スクロールで一緒に動く
 *
 * AC-3: MenuButton
 * - 左上にMenuButtonを表示
 * - タップでDrawerが開く
 *
 * AC-4: 空状態
 * - お気に入り0件でEmptyState表示
 *
 * AC-5: エラー状態
 * - API失敗時にErrorState表示
 *
 * AC-6: ローディング状態
 * - 取得中はSkeletonLoader表示
 *
 * AC-8: 全体統合
 * - useFavoritesからデータ取得
 * - FavoriteListにデータを渡して表示
 */
export default function FavoritesPage() {
  const { favorites, isLoading, error, removeFavorite, refresh } = useFavorites();

  // 状態に応じたコンテンツとカウントを決定
  let content: React.ReactNode;
  let count: string;

  if (isLoading) {
    content = <SkeletonLoader />;
    count = "0件";
  } else if (error) {
    content = <ErrorState onRetry={() => void refresh()} />;
    count = "0件";
  } else if (favorites.length === 0) {
    content = <EmptyState />;
    count = "0件";
  } else {
    content = (
      <FavoriteList
        favorites={favorites}
        onRemove={(articleId) => void removeFavorite(articleId)}
      />
    );
    count = `${String(favorites.length)}件`;
  }

  return (
    <div data-testid="favorites-page" className="min-h-screen bg-gray-50">
      <div className="md:flex">
        {/* 左サイドパネル */}
        <div
          className="hidden md:block flex-1 bg-gray-100"
          style={{ boxShadow: "inset -1px 0 3px rgba(0,0,0,0.06)" }}
        />

        {/* 中央コンテンツ */}
        <div className="w-full md:max-w-[768px] md:shrink-0 md:h-screen md:overflow-y-auto pb-8 px-4">
          {/* AC-2: ヘッダー（スクロールで動く） */}
          <div className="flex items-center justify-between py-4 pl-12 md:pl-4">
            <h1 className="text-lg font-semibold text-gray-800">お気に入り</h1>
            <span className="text-sm text-gray-400">{count}</span>
          </div>
          {content}
        </div>

        {/* 右サイドパネル */}
        <div
          className="hidden md:block flex-1 bg-gray-100"
          style={{ boxShadow: "inset 1px 0 3px rgba(0,0,0,0.06)" }}
        />
      </div>
    </div>
  );
}
