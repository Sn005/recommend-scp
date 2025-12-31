/**
 * SCP Data API Crawler
 * Fetches SCP articles from the SCP Data API
 */

import type { ScpArticleRaw } from "../types.js";

export interface CrawlerOptions {
  limit: number;
  saveLocal: boolean;
  saveDb: boolean;
}

const DEFAULT_OPTIONS: CrawlerOptions = {
  limit: 10,
  saveLocal: true,
  saveDb: true,
};

export async function fetchScpArticles(
  options: Partial<CrawlerOptions> = {}
): Promise<ScpArticleRaw[]> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  // TODO: Implement in Subtask-001-02-01
  console.log(`Fetching ${opts.limit} SCP articles...`);
  return [];
}
