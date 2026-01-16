/**
 * DB保存ユーティリティ
 * Subtask: 003-02-02
 */

import { createClient } from "@supabase/supabase-js";
import type { ArticleContent, ArticleForDb } from "../types";

/**
 * Supabaseクライアントを作成するヘルパー関数
 * 型安全なクライアント作成をサポート
 */
export function createSupabaseClient(url: string, key: string): SupabaseClient {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  return createClient(url, key) as unknown as SupabaseClient;
}

/** Supabaseクライアントの型（最小限） */
export interface SupabaseClient {
  from: (table: string) => {
    upsert: (
      data: ArticleForDb,
      options: { onConflict: string }
    ) => Promise<{ error: { message: string } | null }>;
  };
}

/** DB保存オプション */
export interface DbSaverOptions {
  /** 言語コード */
  lang: string;
  /** ドライラン（DBに保存しない） */
  dryRun?: boolean;
  /** エラー時のコールバック */
  onError?: (articleId: string, error: Error) => void;
}

/** バッチ保存結果 */
export interface SaveResult {
  /** 成功件数 */
  success: number;
  /** 失敗件数 */
  failed: number;
  /** 失敗した記事ID一覧 */
  failedIds: string[];
}

/**
 * 記事をDBに保存するクラス
 */
export class DbSaver {
  private readonly client: SupabaseClient;
  private readonly lang: string;
  private readonly dryRun: boolean;
  private readonly onError?: (articleId: string, error: Error) => void;

  constructor(client: SupabaseClient, options: DbSaverOptions) {
    this.client = client;
    this.lang = options.lang;
    this.dryRun = options.dryRun ?? false;
    this.onError = options.onError;
  }

  /**
   * 記事をDBに保存
   * @param article 保存する記事
   */
  async saveArticle(article: ArticleContent): Promise<void> {
    if (this.dryRun) {
      return;
    }

    const data: ArticleForDb = {
      article_id: article.id,
      lang: this.lang,
      title: article.title,
      content: article.content,
      rating: article.rating,
      tags: article.tags,
      fetched_at: new Date().toISOString(),
      embedding_status: "pending",
      tagging_status: "pending",
    };

    const { error } = await this.client.from("scp_articles").upsert(data, {
      onConflict: "article_id,lang",
    });

    if (error) {
      const err = new Error(error.message);
      this.onError?.(article.id, err);
      throw err;
    }
  }

  /**
   * 複数記事をバッチ保存
   * @param articles 保存する記事の配列
   */
  async saveArticles(articles: ArticleContent[]): Promise<SaveResult> {
    const result: SaveResult = {
      success: 0,
      failed: 0,
      failedIds: [],
    };

    for (const article of articles) {
      try {
        await this.saveArticle(article);
        result.success++;
      } catch {
        result.failed++;
        result.failedIds.push(article.id);
      }
    }

    return result;
  }
}
