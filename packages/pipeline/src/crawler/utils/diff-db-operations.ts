/**
 * 差分クロール用DB操作
 * Subtask: 003-02-03
 */

import type { ArticleContent, DbArticle } from "../types";
import type { DbOperations } from "../diff-crawler";
import { computeContentHash } from "./content-hash";
import { createLogger } from "./logger";

const logger = createLogger({ prefix: "[DiffDB]" });

/** 拡張Supabaseクライアント型 */
export interface ExtendedSupabaseClient {
  from: (table: string) => {
    select: (columns?: string) => {
      eq: (
        column: string,
        value: string
      ) => {
        order: (
          column: string,
          options?: { ascending: boolean }
        ) => Promise<{ data: DbArticle[] | null; error: { message: string } | null }>;
      };
    };
    upsert: (
      data: Record<string, unknown>,
      options: { onConflict: string }
    ) => Promise<{ error: { message: string } | null }>;
    update: (data: Record<string, unknown>) => {
      eq: (
        column: string,
        value: string
      ) => {
        eq: (column: string, value: string) => Promise<{ error: { message: string } | null }>;
      } & Promise<{ error: { message: string } | null }>;
    };
  };
}

/**
 * 差分クロール用DB操作クラス
 */
export class DiffDbOperations implements DbOperations {
  private readonly client: ExtendedSupabaseClient;

  constructor(client: ExtendedSupabaseClient) {
    this.client = client;
  }

  /**
   * 既存記事を取得
   * @param lang 言語コード
   * @returns DB記事の配列
   */
  async fetchExistingArticles(lang: string): Promise<DbArticle[]> {
    const { data, error } = await this.client
      .from("scp_articles")
      .select("*")
      .eq("lang", lang)
      .order("article_id", { ascending: true });

    if (error) {
      logger.error(`既存記事の取得に失敗: ${error.message}`);
      return [];
    }

    return data ?? [];
  }

  /**
   * 新規記事を保存
   * @param article 記事コンテンツ
   * @param lang 言語コード
   */
  async saveArticle(article: ArticleContent, lang: string): Promise<void> {
    const contentHash = computeContentHash(article.content);

    const data = {
      article_id: article.id,
      lang,
      title: article.title,
      content: article.content,
      rating: article.rating,
      tags: article.tags,
      fetched_at: new Date().toISOString(),
      updated_at: article.updatedAt.toISOString(),
      content_hash: contentHash,
      embedding_status: "pending",
      tagging_status: "pending",
      is_deleted: false,
    };

    const { error } = await this.client
      .from("scp_articles")
      .upsert(data, { onConflict: "article_id,lang" });

    if (error) {
      throw new Error(error.message);
    }
  }

  /**
   * 記事を更新
   * @param data 更新データ
   */
  async updateArticle(data: {
    id: string;
    lang: string;
    content: string;
    title: string;
    rating: number;
    tags: string[];
    content_hash: string;
    embedding_status: "pending";
    tagging_status: "pending";
  }): Promise<void> {
    const updateData = {
      content: data.content,
      title: data.title,
      rating: data.rating,
      tags: data.tags,
      content_hash: data.content_hash,
      fetched_at: new Date().toISOString(),
      embedding_status: data.embedding_status,
      tagging_status: data.tagging_status,
    };

    const { error } = await this.client
      .from("scp_articles")
      .update(updateData)
      .eq("article_id", data.id)
      .eq("lang", data.lang);

    if (error) {
      throw new Error(error.message);
    }
  }

  /**
   * 論理削除
   * @param articleId 記事ID
   * @param lang 言語コード
   */
  async markAsDeleted(articleId: string, lang?: string): Promise<void> {
    const query = this.client
      .from("scp_articles")
      .update({ is_deleted: true })
      .eq("article_id", articleId);

    const { error } = lang ? await query.eq("lang", lang) : await query;

    if (error) {
      throw new Error(error.message);
    }
  }
}
