/**
 * SCP Data API Crawler
 * Fetches articles from https://scp-data.tedivm.com/
 */

import type { ScpArticleRaw } from "../types";

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
    throw new Error(`Failed to fetch index: ${response.status}`);
  }
  return response.json() as Promise<ScpIndex>;
};

/**
 * Fetch content for a specific series
 */
const fetchSeriesContent = async (
  seriesFile: string
): Promise<Record<string, ScpContentItem>> => {
  const response = await fetch(`${BASE_URL}/content_${seriesFile}.json`);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${seriesFile}: ${response.status}`);
  }
  return response.json() as Promise<Record<string, ScpContentItem>>;
};

/**
 * Extract plain text from HTML content
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
 * Filter and sort articles by rating
 */
const getTopArticles = (
  index: ScpIndex,
  options: CrawlerOptions
): ScpIndexItem[] =>
  Object.values(index)
    .filter((item) => {
      const seriesMatch = options.series.some((s) =>
        item.content_file.includes(s)
      );
      const ratingMatch = item.rating >= options.minRating;
      const isScp = item.scp?.startsWith("SCP-") ?? false;
      return seriesMatch && ratingMatch && isScp;
    })
    .sort((a, b) => b.rating - a.rating)
    .slice(0, options.limit);

/**
 * Group articles by content file
 */
const groupByContentFile = (
  articles: ScpIndexItem[]
): Record<string, ScpIndexItem[]> =>
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

  console.log(`Fetching SCP index...`);
  const index = await fetchIndex();

  console.log(`Found ${Object.keys(index).length} items in index`);

  const topArticles = getTopArticles(index, opts);
  console.log(
    `Selected top ${topArticles.length} articles by rating (min: ${opts.minRating})`
  );

  const contentFileGroups = groupByContentFile(topArticles);

  const articlePromises = Object.entries(contentFileGroups).map(
    async ([contentFile, items]): Promise<ScpArticleRaw[]> => {
      const seriesName = contentFile.replace("content_", "").replace(".json", "");
      console.log(`Fetching content from ${contentFile}...`);

      try {
        const content = await fetchSeriesContent(seriesName);
        // Normalize to lowercase for matching (index uses lowercase, content uses uppercase)
        const itemLinksLower = new Set(items.map((i) => i.link.toLowerCase()));

        return Object.entries(content)
          .filter(([key]) => itemLinksLower.has(key.toLowerCase()))
          .map(([, item]): ScpArticleRaw => ({
            id: item.scp,
            title: item.title,
            content: htmlToPlainText(item.raw_content || ""),
            rating: item.rating,
          }));
      } catch (error) {
        console.error(`Failed to fetch ${contentFile}: ${error}`);
        return [];
      }
    }
  );

  const articlesArrays = await Promise.all(articlePromises);
  const articles = articlesArrays.flat();

  return articles.sort((a, b) => b.rating - a.rating);
};
