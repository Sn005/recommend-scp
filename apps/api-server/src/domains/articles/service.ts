/**
 * @file ArticlesService
 * @description articlesドメインのビジネスロジック層
 * @see specs/005-backend-api/005-04-articles-api/005-04-01.md
 */

import type { ArticlesRepository } from "./repository";
import { createEmbedding } from "../../lib/openai";

/**
 * 記事検索結果の1件
 */
export interface SearchArticle {
  /** 記事ID */
  id: string;
  /** タイトル */
  title: string;
  /** 類似度スコア（0〜1） */
  similarity: number;
  /** タグ一覧（オプション） */
  tags?: string[];
}

/**
 * 記事検索結果
 */
export interface SearchArticlesResult {
  /** 検索結果の記事一覧 */
  articles: SearchArticle[];
  /** 検索結果の総件数 */
  total: number;
  /** 検索クエリ */
  query: string;
}

/**
 * 検索オプション
 */
export interface SearchArticlesOptions {
  /** 取得件数上限（デフォルト: 10） */
  limit?: number;
}

/**
 * ArticlesService
 *
 * 記事のセマンティック検索を提供する。
 * クエリテキストをEmbeddingに変換し、ベクトル類似度検索を実行する。
 */
export class ArticlesService {
  constructor(private readonly repository: ArticlesRepository) {}

  /**
   * テキストクエリによるセマンティック検索
   *
   * 1. クエリをOpenAI Embedding APIでベクトル化
   * 2. pgvector RPC関数で類似記事を検索
   * 3. 類似度降順でソートされた結果を返す
   *
   * @param query - 検索クエリ（日本語・英語対応）
   * @param options - 検索オプション
   * @returns 検索結果
   */
  searchArticles = async (
    query: string,
    options: SearchArticlesOptions = {}
  ): Promise<SearchArticlesResult> => {
    // クエリをEmbeddingに変換
    const queryVector = await createEmbedding(query);

    // ベクトル検索
    const results = await this.repository.searchByEmbedding(queryVector, {
      limit: options.limit ?? 10,
    });

    return {
      articles: results.map(
        (r): SearchArticle => ({
          id: r.id,
          title: r.title,
          similarity: r.similarity,
        })
      ),
      total: results.length,
      query,
    };
  };
}
