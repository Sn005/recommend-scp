/**
 * 差分クローラー
 * Subtask: 003-02-03
 */

import type {
  ArticleIndex,
  ArticleContent,
  DbArticle,
  BranchCrawler,
  DiffDetectionResult,
  DiffCrawlOptions,
  DiffCrawlResult,
} from "./types";
import { computeContentHash } from "./utils/content-hash";

/** DB操作インターフェース */
export interface DbOperations {
  /** 既存記事を取得 */
  fetchExistingArticles(lang: string): Promise<DbArticle[]>;
  /** 新規記事を保存 */
  saveArticle(article: ArticleContent, lang: string): Promise<void>;
  /** 記事を更新 */
  updateArticle(data: {
    id: string;
    lang: string;
    content: string;
    title: string;
    rating: number;
    tags: string[];
    content_hash: string;
    embedding_status: "pending";
    tagging_status: "pending";
  }): Promise<void>;
  /** 論理削除 */
  markAsDeleted(articleId: string, lang?: string): Promise<void>;
}

/**
 * API記事一覧とDB記事を比較して差分を検出
 * @param apiArticles APIから取得した記事一覧
 * @param dbArticleMap DBの記事マップ（article_id -> DbArticle）
 * @returns 差分検出結果
 */
export const detectChanges = (
  apiArticles: ArticleIndex[],
  dbArticleMap: Map<string, DbArticle>
): DiffDetectionResult => {
  const newArticleIds: string[] = [];
  const updatedArticleIds: string[] = [];
  const unchangedArticleIds: string[] = [];

  const apiArticleIds = new Set(apiArticles.map((a) => a.id));

  // API記事をチェック
  for (const article of apiArticles) {
    const dbArticle = dbArticleMap.get(article.id);
    if (!dbArticle) {
      newArticleIds.push(article.id);
    } else {
      // 既存記事は一旦unchangedに分類（後でコンテンツハッシュで再分類）
      unchangedArticleIds.push(article.id);
    }
  }

  // DB記事でAPIにないものを削除対象に
  const deletedArticleIds: string[] = [];
  for (const [articleId, dbArticle] of dbArticleMap) {
    if (!apiArticleIds.has(articleId) && !dbArticle.is_deleted) {
      deletedArticleIds.push(articleId);
    }
  }

  return {
    newArticleIds,
    updatedArticleIds,
    deletedArticleIds,
    unchangedArticleIds,
  };
};

/**
 * 差分クローラークラス
 */
export class DiffCrawler {
  private readonly crawler: BranchCrawler;
  private readonly dbOps: DbOperations;

  constructor(crawler: BranchCrawler, dbOps: DbOperations) {
    this.crawler = crawler;
    this.dbOps = dbOps;
  }

  /**
   * 差分を検出して分類する
   * @returns 差分検出結果（コンテンツハッシュ比較済み）
   */
  async detectAndClassify(): Promise<DiffDetectionResult> {
    // API記事一覧を取得
    const apiArticles = await this.crawler.fetchArticleList();

    // DB記事を取得
    const dbArticles = await this.dbOps.fetchExistingArticles(this.crawler.lang);
    const dbArticleMap = new Map(dbArticles.map((a) => [a.article_id, a]));

    // 初期差分検出
    const initialResult = detectChanges(apiArticles, dbArticleMap);

    // unchangedの記事についてコンテンツハッシュを比較
    const updatedArticleIds: string[] = [...initialResult.updatedArticleIds];
    const unchangedArticleIds: string[] = [];

    for (const articleId of initialResult.unchangedArticleIds) {
      const dbArticle = dbArticleMap.get(articleId);
      if (!dbArticle) continue;

      // コンテンツハッシュがない場合は更新対象
      if (!dbArticle.content_hash) {
        updatedArticleIds.push(articleId);
        continue;
      }

      // APIから本文を取得してハッシュ比較
      try {
        const apiContent = await this.crawler.fetchArticleContent(articleId);
        const newHash = computeContentHash(apiContent.content);

        if (newHash !== dbArticle.content_hash) {
          updatedArticleIds.push(articleId);
        } else {
          unchangedArticleIds.push(articleId);
        }
      } catch {
        // 取得エラーの場合は変更なしとして扱う
        unchangedArticleIds.push(articleId);
      }
    }

    return {
      newArticleIds: initialResult.newArticleIds,
      updatedArticleIds,
      deletedArticleIds: initialResult.deletedArticleIds,
      unchangedArticleIds,
    };
  }

  /**
   * 差分クロールを実行
   * @param options オプション
   * @returns 差分クロール結果
   */
  async run(options: DiffCrawlOptions = {}): Promise<DiffCrawlResult> {
    const startTime = Date.now();
    const { onProgress, dryRun = false } = options;

    const result: DiffCrawlResult = {
      newCount: 0,
      updatedCount: 0,
      deletedCount: 0,
      unchangedCount: 0,
      failedCount: 0,
      failedIds: [],
      durationMs: 0,
    };

    // 検出フェーズ
    onProgress?.({
      phase: "detect",
      current: 0,
      total: 1,
      message: "差分を検出中...",
    });

    // API記事一覧を取得
    const apiArticles = await this.crawler.fetchArticleList();

    // DB記事を取得
    const dbArticles = await this.dbOps.fetchExistingArticles(this.crawler.lang);
    const dbArticleMap = new Map(dbArticles.map((a) => [a.article_id, a]));

    // 初期差分検出
    const initialResult = detectChanges(apiArticles, dbArticleMap);

    // 既存記事について更新日時を確認して分類
    const potentiallyUpdatedIds: string[] = [];
    const unchangedArticleIds: string[] = [];

    for (const articleId of initialResult.unchangedArticleIds) {
      const dbArticle = dbArticleMap.get(articleId);
      if (!dbArticle) continue;

      // ハッシュがない場合は更新対象
      if (!dbArticle.content_hash) {
        potentiallyUpdatedIds.push(articleId);
        continue;
      }

      // 更新日時を取得して比較
      const apiUpdatedAt = await this.crawler.getLastModified(articleId);
      const dbUpdatedAt = new Date(dbArticle.updated_at);

      if (apiUpdatedAt && apiUpdatedAt.getTime() > dbUpdatedAt.getTime()) {
        // 更新日時が新しい場合は本文取得が必要
        potentiallyUpdatedIds.push(articleId);
      } else {
        unchangedArticleIds.push(articleId);
      }
    }

    result.unchangedCount = unchangedArticleIds.length;

    // 本文を取得してハッシュ比較が必要な記事
    const updatedArticleIds: string[] = [];

    for (const articleId of potentiallyUpdatedIds) {
      const dbArticle = dbArticleMap.get(articleId);
      if (!dbArticle) continue;

      try {
        const content = await this.crawler.fetchArticleContent(articleId);
        const newHash = computeContentHash(content.content);

        if (!dbArticle.content_hash || newHash !== dbArticle.content_hash) {
          updatedArticleIds.push(articleId);
        } else {
          unchangedArticleIds.push(articleId);
          result.unchangedCount++;
        }
      } catch {
        // 取得エラーの場合は変更なしとして扱う
        unchangedArticleIds.push(articleId);
        result.unchangedCount++;
      }
    }

    // 新規記事の処理
    const newArticleIds = initialResult.newArticleIds;
    onProgress?.({
      phase: "fetch_new",
      current: 0,
      total: newArticleIds.length,
      message: `新規記事を取得中... (${String(newArticleIds.length)}件)`,
    });

    for (let i = 0; i < newArticleIds.length; i++) {
      const articleId = newArticleIds[i];
      try {
        const content = await this.crawler.fetchArticleContent(articleId);

        if (!dryRun) {
          await this.dbOps.saveArticle(content, this.crawler.lang);
        }

        result.newCount++;
        onProgress?.({
          phase: "fetch_new",
          current: i + 1,
          total: newArticleIds.length,
        });
      } catch {
        result.failedCount++;
        result.failedIds.push(articleId);
      }
    }

    // 更新記事の処理（コンテンツは既に取得済み、DBに保存）
    onProgress?.({
      phase: "fetch_updated",
      current: 0,
      total: updatedArticleIds.length,
      message: `更新記事を保存中... (${String(updatedArticleIds.length)}件)`,
    });

    for (let i = 0; i < updatedArticleIds.length; i++) {
      const articleId = updatedArticleIds[i];
      try {
        // 既に取得済みのコンテンツを再取得（キャッシュがあれば効率的）
        const content = await this.crawler.fetchArticleContent(articleId);
        const newHash = computeContentHash(content.content);

        if (!dryRun) {
          await this.dbOps.updateArticle({
            id: content.id,
            lang: this.crawler.lang,
            content: content.content,
            title: content.title,
            rating: content.rating,
            tags: content.tags,
            content_hash: newHash,
            embedding_status: "pending",
            tagging_status: "pending",
          });
        }

        result.updatedCount++;
        onProgress?.({
          phase: "fetch_updated",
          current: i + 1,
          total: updatedArticleIds.length,
        });
      } catch {
        result.failedCount++;
        result.failedIds.push(articleId);
      }
    }

    // 削除記事の処理
    const deletedArticleIds = initialResult.deletedArticleIds;
    onProgress?.({
      phase: "delete",
      current: 0,
      total: deletedArticleIds.length,
      message: `削除記事を処理中... (${String(deletedArticleIds.length)}件)`,
    });

    for (let i = 0; i < deletedArticleIds.length; i++) {
      const articleId = deletedArticleIds[i];
      try {
        if (!dryRun) {
          await this.dbOps.markAsDeleted(articleId, this.crawler.lang);
        }

        result.deletedCount++;
        onProgress?.({
          phase: "delete",
          current: i + 1,
          total: deletedArticleIds.length,
        });
      } catch {
        result.failedCount++;
        result.failedIds.push(articleId);
      }
    }

    result.durationMs = Date.now() - startTime;
    return result;
  }
}
