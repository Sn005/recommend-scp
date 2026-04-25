/**
 * @file FavoritesService
 * @description favoritesドメインのビジネスロジック層
 * @see specs/005-backend-api/005-10-favorites-api/005-10-01.md
 */

import type { FavoritesRepository } from "./repository";
import type { VisitorsRepository } from "../visitors/repository";
import type { FavoriteWithArticle, AddFavoriteResult } from "./types";
import { NotFoundError } from "../../lib/errors";
import { cacheGet, cacheSet, cacheDelete } from "../../lib/cache";

const FAVORITES_CACHE_TTL_SECONDS = 60;
const favoritesCacheKey = (visitorId: string): string => `favorites:${visitorId}`;

/**
 * FavoritesService
 *
 * お気に入り機能のビジネスロジックを提供。
 * visitorIdの存在確認を行い、Repository経由でデータ操作を行う。
 */
export class FavoritesService {
  constructor(
    private readonly favoritesRepository: FavoritesRepository,
    private readonly visitorsRepository: VisitorsRepository
  ) {}

  /**
   * お気に入り一覧を取得
   *
   * @param visitorId - クライアント生成UUID
   * @returns FavoriteWithArticle[]
   * @throws NotFoundError - visitorIdが存在しない場合
   */
  getFavorites = async (visitorId: string): Promise<FavoriteWithArticle[]> => {
    // visitorId存在確認
    const visitor = await this.visitorsRepository.findByVisitorId(visitorId);
    if (!visitor) {
      throw new NotFoundError("Visitor", visitorId);
    }

    // キャッシュヒット時はDBアクセスをスキップ
    const cacheKey = favoritesCacheKey(visitorId);
    const cached = await cacheGet<FavoriteWithArticle[]>(cacheKey);
    if (cached !== null) return cached;

    const favorites = await this.favoritesRepository.getByVisitorId(visitorId);
    await cacheSet(cacheKey, favorites, FAVORITES_CACHE_TTL_SECONDS);
    return favorites;
  };

  /**
   * お気に入りを追加
   *
   * @param visitorId - クライアント生成UUID
   * @param articleId - 記事ID
   * @returns { articleId, favoritedAt, isNew }
   * @throws NotFoundError - visitorIdが存在しない場合
   */
  addFavorite = async (
    visitorId: string,
    articleId: string
  ): Promise<{ articleId: string; favoritedAt: string; isNew: boolean }> => {
    // visitorId存在確認
    const visitor = await this.visitorsRepository.findByVisitorId(visitorId);
    if (!visitor) {
      throw new NotFoundError("Visitor", visitorId);
    }

    // Repository.addで追加（UPSERT）
    const result: AddFavoriteResult = await this.favoritesRepository.add(visitorId, articleId);

    // キャッシュ無効化（次回の getFavorites で最新リストを再計算）
    await cacheDelete(favoritesCacheKey(visitorId));

    return {
      articleId: result.articleId,
      favoritedAt: result.addedAt,
      isNew: result.isNew,
    };
  };

  /**
   * お気に入りを削除
   *
   * @param visitorId - クライアント生成UUID
   * @param articleId - 記事ID
   * @throws NotFoundError - visitorIdが存在しない場合
   * @throws NotFoundError - お気に入りが見つからない場合
   */
  removeFavorite = async (visitorId: string, articleId: string): Promise<void> => {
    // visitorId存在確認
    const visitor = await this.visitorsRepository.findByVisitorId(visitorId);
    if (!visitor) {
      throw new NotFoundError("Visitor", visitorId);
    }

    // お気に入り削除
    const deleted = await this.favoritesRepository.remove(visitorId, articleId);
    if (!deleted) {
      throw new NotFoundError("Favorite", articleId);
    }

    // キャッシュ無効化
    await cacheDelete(favoritesCacheKey(visitorId));
  };
}
