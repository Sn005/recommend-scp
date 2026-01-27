/**
 * SCP Data API Crawler
 * Fetches articles from https://scp-data.tedivm.com/
 */

import type { ScpArticleRaw } from "@recommend-scp/shared/types";
import { createLogger } from "./utils/logger";

const logger = createLogger({ prefix: "[Crawler]" });

const BASE_URL = "https://scp-data.tedivm.com/data/scp/items";

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

export interface CrawlerOptions {
  limit: number;
  minRating: number;
  series: string[];
}

const DEFAULT_OPTIONS: CrawlerOptions = {
  limit: 10,
  minRating: 0,
  series: ["series-1", "series-2", "series-3"],
};

/**
 * Fetch SCP index with metadata (ratings, etc.)
 */
const fetchIndex = async (): Promise<ScpIndex> => {
  const response = await fetch(`${BASE_URL}/index.json`);
  if (!response.ok) {
    throw new Error(`インデックス取得に失敗: ${String(response.status)}`);
  }
  return response.json() as Promise<ScpIndex>;
};

/**
 * Fetch content for a specific series
 */
const fetchSeriesContent = async (seriesFile: string): Promise<Record<string, ScpContentItem>> => {
  const response = await fetch(`${BASE_URL}/content_${seriesFile}.json`);
  if (!response.ok) {
    throw new Error(`${seriesFile}の取得に失敗: ${String(response.status)}`);
  }
  return response.json() as Promise<Record<string, ScpContentItem>>;
};

/**
 * Extract plain text from HTML content
 * CSSコード、スクリプト、HTMLタグを除去してプレーンテキストを抽出
 */
const htmlToPlainText = (html: string): string => {
  let text = html;

  // 1. style/scriptタグとその内容を除去
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ");
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ");

  // 2. HTMLタグを除去
  text = text.replace(/<[^>]+>/g, " ");

  // 3. CSSコメントを除去
  text = text.replace(/\/\*[\s\S]*?\*\//g, " ");

  // 4. CSSブロック（{...}）を除去（ネスト対応で複数回実行）
  for (let i = 0; i < 3; i++) {
    text = text.replace(/\{[^{}]*\}/g, " ");
  }

  // 5. @ルール（@media, @import等）を除去
  text = text.replace(/@[\w-]+[^;]*;/g, " ");

  // 6. HTMLエンティティをデコード
  text = text.replace(/&nbsp;/g, " ");
  text = text.replace(/&amp;/g, "&");
  text = text.replace(/&lt;/g, "<");
  text = text.replace(/&gt;/g, ">");
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");

  // 7. 空白を正規化
  text = text.replace(/\s+/g, " ").trim();

  return text;
};

/**
 * Filter and sort articles by rating
 */
const getTopArticles = (index: ScpIndex, options: CrawlerOptions): ScpIndexItem[] =>
  Object.values(index)
    .filter((item) => {
      const seriesMatch = options.series.some((s) => item.content_file.includes(s));
      const ratingMatch = item.rating >= options.minRating;
      const isScp = item.scp.startsWith("SCP-");
      return seriesMatch && ratingMatch && isScp;
    })
    .sort((a, b) => b.rating - a.rating)
    .slice(0, options.limit);

/**
 * Group articles by content file
 */
const groupByContentFile = (articles: ScpIndexItem[]): Record<string, ScpIndexItem[]> =>
  articles.reduce<Record<string, ScpIndexItem[]>>((acc, article) => {
    const file = article.content_file;
    return {
      ...acc,
      [file]: [...(acc[file] ?? []), article],
    };
  }, {});

/**
 * Fetch SCP articles with content
 */
export const fetchScpArticles = async (
  options?: Partial<CrawlerOptions>
): Promise<ScpArticleRaw[]> => {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  logger.info("SCPインデックスを取得中...");
  const index = await fetchIndex();

  const indexCount = Object.keys(index).length;
  logger.info(`インデックスに${String(indexCount)}件のアイテムを発見`);

  const topArticles = getTopArticles(index, opts);
  logger.info(
    `レーティング上位${String(topArticles.length)}件を選択 (最小: ${String(opts.minRating)})`
  );

  const contentFileGroups = groupByContentFile(topArticles);

  const articlePromises = Object.entries(contentFileGroups).map(
    async ([contentFile, items]): Promise<ScpArticleRaw[]> => {
      const seriesName = contentFile.replace("content_", "").replace(".json", "");
      logger.info(`${contentFile}からコンテンツを取得中...`);

      try {
        const content = await fetchSeriesContent(seriesName);
        // Normalize to lowercase for matching (index uses lowercase, content uses uppercase)
        const itemLinksLower = new Set(items.map((i) => i.link.toLowerCase()));

        return Object.entries(content)
          .filter(([key]) => itemLinksLower.has(key.toLowerCase()))
          .map(
            ([, item]): ScpArticleRaw => ({
              id: item.scp,
              title: item.title,
              content: htmlToPlainText(item.raw_content || ""),
              rating: item.rating,
            })
          );
      } catch (error) {
        logger.error(`${contentFile}の取得に失敗: ${String(error)}`);
        return [];
      }
    }
  );

  const articlesArrays = await Promise.all(articlePromises);
  const articles = articlesArrays.flat();

  return articles.sort((a, b) => b.rating - a.rating);
};
