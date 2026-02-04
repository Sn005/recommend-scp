/**
 * @file FavoritesService
 * @description favoritesドメインのビジネスロジック層
 * @see specs/005-backend-api/005-10-favorites-api/005-10-01.md
 */

import type { FavoritesRepository } from "./repository";
import type { VisitorsRepository } from "../visitors/repository";
import type { FavoriteWithArticle } from "./types";
import { NotFoundError } from "../../lib/errors";

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

    return this.favoritesRepository.getByVisitorId(visitorId);
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
  };
}
