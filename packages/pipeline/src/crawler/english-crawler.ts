/**
 * 英語版SCP Wikiクローラー
 * scp-data.tedivm.com APIを使用
 * Subtask: 003-02-01
 */

import type { ArticleContent, ArticleIndex, BranchCrawler } from "./types";

const BASE_URL = "https://scp-data.tedivm.com/data/scp/items";

/** Fetch タイムアウト（ミリ秒） */
const FETCH_TIMEOUT_MS = 30000;

/**
 * タイムアウト付きfetchを実行する
 */
async function fetchWithTimeout(url: string, timeoutMs = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

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

interface ScpContentItem extends ScpIndexItem {
  raw_content: string;
  raw_source: string;
}

type ScpIndex = Record<string, ScpIndexItem>;

/** HTMLからプレーンテキストを抽出 */
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

/** シリーズ名を抽出 */
const extractSeries = (contentFile: string): string => {
  const match = /series-(\d+)/.exec(contentFile);
  return match ? `series-${match[1]}` : "unknown";
};

/** 英語版SCP Wikiクローラー */
export class EnglishCrawler implements BranchCrawler {
  readonly lang = "en";
  readonly crawlerType = "api" as const;

  private indexCache: ScpIndex | null = null;
  private contentCache = new Map<string, Record<string, ScpContentItem>>();

  /** インデックスを取得（キャッシュあり） */
  private async getIndex(): Promise<ScpIndex> {
    if (this.indexCache) {
      return this.indexCache;
    }

    const response = await fetchWithTimeout(`${BASE_URL}/index.json`);
    if (!response.ok) {
      throw new Error(`インデックス取得に失敗: ${String(response.status)}`);
    }

    this.indexCache = (await response.json()) as ScpIndex;
    return this.indexCache;
  }

  /** シリーズコンテンツを取得（キャッシュあり） */
  private async getSeriesContent(seriesName: string): Promise<Record<string, ScpContentItem>> {
    const cached = this.contentCache.get(seriesName);
    if (cached) {
      return cached;
    }

    const response = await fetchWithTimeout(`${BASE_URL}/content_${seriesName}.json`);
    if (!response.ok) {
      throw new Error(`${seriesName}の取得に失敗: ${String(response.status)}`);
    }

    const content = (await response.json()) as Record<string, ScpContentItem>;
    this.contentCache.set(seriesName, content);
    return content;
  }

  /** インデックスからアイテムを検索 */
  private findIndexItem(id: string, index: ScpIndex): ScpIndexItem | undefined {
    // IDで直接検索（大文字小文字を無視）
    const normalizedId = id.toLowerCase();
    return Object.values(index).find((item) => item.scp.toLowerCase() === normalizedId);
  }

  /** 記事一覧を取得 */
  async fetchArticleList(): Promise<ArticleIndex[]> {
    const index = await this.getIndex();

    return Object.values(index)
      .filter((item) => item.scp.startsWith("SCP-"))
      .map((item) => ({
        id: item.scp,
        title: item.title,
        url: item.link.startsWith("http") ? item.link : `https://scp-wiki.wikidot.com${item.link}`,
        series: extractSeries(item.content_file),
      }));
  }

  /** 指定IDの記事コンテンツを取得 */
  async fetchArticleContent(id: string): Promise<ArticleContent> {
    const index = await this.getIndex();
    const indexItem = this.findIndexItem(id, index);

    if (!indexItem) {
      throw new Error(`記事が見つかりません: ${id}`);
    }

    const seriesName = indexItem.content_file.replace("content_", "").replace(".json", "");
    const seriesContent = await this.getSeriesContent(seriesName);

    // コンテンツを検索（linkをキーとして使用）
    const contentItem = Object.values(seriesContent).find(
      (item) => item.scp.toLowerCase() === id.toLowerCase()
    );

    if (!contentItem) {
      throw new Error(`コンテンツが見つかりません: ${id}`);
    }

    return {
      id: contentItem.scp,
      title: contentItem.title,
      content: htmlToPlainText(contentItem.raw_content || ""),
      rating: contentItem.rating,
      tags: contentItem.tags,
      createdAt: new Date(contentItem.created_at),
      updatedAt: new Date(contentItem.created_at), // APIに更新日がないため作成日を使用
    };
  }

  /** 指定IDの最終更新日時を取得 */
  async getLastModified(id: string): Promise<Date | null> {
    const index = await this.getIndex();
    const indexItem = this.findIndexItem(id, index);

    if (!indexItem) {
      return null;
    }

    // APIには更新日時がないため、作成日時を返す
    return new Date(indexItem.created_at);
  }
}
