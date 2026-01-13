/**
 * English Branch Crawler
 *
 * SCP財団英語版（scp-wiki.wikidot.com）のクローラー実装。
 * tedivm氏が提供するSCP Data API（https://scp-data.tedivm.com/）を利用する。
 */

import type { ArticleIndex, ArticleContent, BranchCrawler } from "./types";

const BASE_URL = "https://scp-data.tedivm.com/data/scp/items";

/**
 * API レスポンスの型（index.json）
 */
interface ScpIndexItem {
  link: string;
  title: string;
  rating: number;
  content_file: string;
  scp: string;
  tags: string[];
  created_at: string;
  creator: string;
}

/**
 * API レスポンスの型（content_{series}.json）
 */
interface ScpContentItem extends ScpIndexItem {
  raw_content: string;
  raw_source: string;
}

type ScpIndex = Record<string, ScpIndexItem>;

/**
 * HTMLをプレーンテキストに変換する
 */
const htmlToPlainText = (html: string): string =>
  html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

/**
 * シリーズを判定する
 */
const detectSeries = (scpNumber: number): string => {
  if (scpNumber <= 999) return "series-1";
  if (scpNumber <= 1999) return "series-2";
  if (scpNumber <= 2999) return "series-3";
  if (scpNumber <= 3999) return "series-4";
  if (scpNumber <= 4999) return "series-5";
  if (scpNumber <= 5999) return "series-6";
  if (scpNumber <= 6999) return "series-7";
  if (scpNumber <= 7999) return "series-8";
  return "series-9";
};

/**
 * SCP IDから番号を抽出する
 */
const extractScpNumber = (id: string): number => {
  const match = id.match(/SCP-(\d+)/i);
  if (!match) {
    throw new Error(`Invalid SCP ID format: ${id}`);
  }
  return parseInt(match[1], 10);
};

/**
 * 英語版SCP Wikiのクローラー実装
 */
export class EnglishCrawler implements BranchCrawler {
  readonly lang = "en";
  readonly crawlerType = "api" as const;

  private indexCache: ScpIndex | null = null;

  /**
   * 記事一覧を取得する
   */
  async fetchArticleList(): Promise<ArticleIndex[]> {
    const index = await this.getIndex();

    return Object.entries(index)
      .filter(([, item]) => item.scp?.startsWith("SCP-"))
      .map(([key, item]): ArticleIndex => {
        const scpNumber = extractScpNumber(item.scp);
        return {
          id: item.scp,
          title: item.title,
          url: `https://scp-wiki.wikidot.com/${key}`,
          series: detectSeries(scpNumber),
        };
      });
  }

  /**
   * 指定IDの記事コンテンツを取得する
   */
  async fetchArticleContent(id: string): Promise<ArticleContent> {
    if (!id || typeof id !== "string") {
      throw new Error("Article ID is required");
    }

    // IDを正規化（小文字 → 大文字）
    const normalizedId = id.toUpperCase();
    if (!normalizedId.match(/^SCP-\d+$/)) {
      throw new Error(`Invalid SCP ID format: ${id}`);
    }

    const scpNumber = extractScpNumber(normalizedId);
    const series = detectSeries(scpNumber);

    const response = await fetch(`${BASE_URL}/content_${series}.json`);
    if (!response.ok) {
      throw new Error(`Failed to fetch content: ${response.status}`);
    }

    const content = (await response.json()) as Record<string, ScpContentItem>;

    // キーは小文字で格納されている
    const key = normalizedId.toLowerCase();
    const item = content[key];

    if (!item) {
      throw new Error(`Article not found: ${id}`);
    }

    return {
      id: item.scp,
      title: item.title,
      content: htmlToPlainText(item.raw_content || ""),
      rating: item.rating,
      tags: item.tags || [],
      createdAt: new Date(item.created_at),
      updatedAt: new Date(item.created_at), // APIには更新日時がないため作成日時を使用
    };
  }

  /**
   * 指定IDの記事の最終更新日時を取得する
   */
  async getLastModified(id: string): Promise<Date | null> {
    try {
      const index = await this.getIndex();
      const key = id.toLowerCase();
      const item = index[key];

      if (!item) {
        return null;
      }

      return new Date(item.created_at);
    } catch {
      return null;
    }
  }

  /**
   * インデックスを取得する（キャッシュ付き）
   */
  private async getIndex(): Promise<ScpIndex> {
    if (this.indexCache) {
      return this.indexCache;
    }

    const response = await fetch(`${BASE_URL}/index.json`);
    if (!response.ok) {
      throw new Error(`Failed to fetch index: ${response.status}`);
    }

    this.indexCache = (await response.json()) as ScpIndex;
    return this.indexCache;
  }
}
