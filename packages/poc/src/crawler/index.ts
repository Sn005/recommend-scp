/**
 * クローラーモジュール
 *
 * SCP記事を取得するクローラーの抽象化レイヤー。
 * Factory経由で言語を切り替えることで、異なる支部に対応可能。
 */

// 型定義
export type { ArticleIndex, ArticleContent, CrawlProgress, BranchCrawler } from "./types";

// Factory
export { CrawlerFactory } from "./factory";

// 実装クラス
export { EnglishCrawler } from "./english-crawler";

// レガシーAPI（後方互換性のため維持）
export { fetchScpArticles, type CrawlerOptions } from "./fetch-scp";
