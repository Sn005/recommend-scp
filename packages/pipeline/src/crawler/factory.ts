/**
 * クローラーファクトリー
 * 言語コードに応じて適切なクローラーを返す
 * Subtask: 003-02-01
 */

import type { BranchCrawler } from "./types";
import { EnglishCrawler } from "./english-crawler";

/** 対応クローラーのレジストリ */
const crawlers: Record<string, (new () => BranchCrawler) | undefined> = {
  en: EnglishCrawler,
  // ja: JapaneseCrawler,  // 将来追加
};

/**
 * クローラーファクトリー
 * 言語コードに応じて適切なクローラーを返す
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class CrawlerFactory {
  /**
   * 言語コードに対応するクローラーを生成
   * @param lang 言語コード（例: 'en', 'ja'）
   * @returns BranchCrawlerインスタンス
   * @throws 未対応言語の場合
   */
  static create(lang: string): BranchCrawler {
    const CrawlerClass = crawlers[lang];
    if (!CrawlerClass) {
      const supported = Object.keys(crawlers).join(", ");
      throw new Error(`未対応の言語: ${lang}。対応言語: ${supported}`);
    }
    return new CrawlerClass();
  }

  /**
   * 対応言語一覧を取得
   * @returns 対応言語コードの配列
   */
  static getSupportedLanguages(): string[] {
    return Object.keys(crawlers);
  }
}
