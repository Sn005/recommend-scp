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

  // AC-6: ローディング状態
  if (isLoading) {
    return (
      <div data-testid="favorites-page" className="min-h-screen bg-gray-50">
        <main className="pb-8 px-4">
          {/* ヘッダー */}
          <div className="flex items-center justify-between py-4 pl-12">
            <h1 className="text-lg font-semibold text-gray-800">お気に入り</h1>
            <span className="text-sm text-gray-400">0件</span>
          </div>
          <SkeletonLoader />
        </main>
      </div>
    );
  }

  // AC-5: エラー状態
  if (error) {
    return (
      <div data-testid="favorites-page" className="min-h-screen bg-gray-50">
        <main className="pb-8 px-4">
          {/* ヘッダー */}
          <div className="flex items-center justify-between py-4 pl-12">
            <h1 className="text-lg font-semibold text-gray-800">お気に入り</h1>
            <span className="text-sm text-gray-400">0件</span>
          </div>
          <ErrorState onRetry={() => void refresh()} />
        </main>
      </div>
    );
  }

  // AC-4: 空状態
  if (favorites.length === 0) {
    return (
      <div data-testid="favorites-page" className="min-h-screen bg-gray-50">
        <main className="pb-8 px-4">
          {/* ヘッダー */}
          <div className="flex items-center justify-between py-4 pl-12">
            <h1 className="text-lg font-semibold text-gray-800">お気に入り</h1>
            <span className="text-sm text-gray-400">0件</span>
          </div>
          <EmptyState />
        </main>
      </div>
    );
  }

  // AC-2, AC-8: 通常表示
  return (
    <div data-testid="favorites-page" className="min-h-screen bg-gray-50">
      <main className="pb-8 px-4">
        {/* AC-2: ヘッダー（スクロールで動く） */}
        <div className="flex items-center justify-between py-4 pl-12">
          <h1 className="text-lg font-semibold text-gray-800">お気に入り</h1>
          <span className="text-sm text-gray-400">{favorites.length}件</span>
        </div>

        {/* AC-8: お気に入りリスト */}
        <FavoriteList
          favorites={favorites}
          onRemove={(articleId) => void removeFavorite(articleId)}
        />
      </main>
    </div>
  );
}
