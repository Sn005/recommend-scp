/**
 * Crawler Factory
 *
 * 言語コードからクローラーインスタンスを生成する。
 * Factoryパターンにより、新しい言語支部のクローラーを追加する際は
 * crawlersオブジェクトに登録するだけで対応できる。
 */

import type { BranchCrawler } from "./types";
import { EnglishCrawler } from "./english-crawler";

/**
 * 言語コードとクローラークラスのマッピング
 */
const crawlers: Record<string, new () => BranchCrawler> = {
  en: EnglishCrawler,
  // ja: JapaneseCrawler,  // 将来追加
  // ko: KoreanCrawler,    // 将来追加
  // cn: ChineseCrawler,   // 将来追加
  // fr: FrenchCrawler,    // 将来追加
};

/**
 * クローラーファクトリー
 */
export class CrawlerFactory {
  /**
   * 言語コードから適切なクローラーインスタンスを生成する
   * @param lang 言語コード（例: 'en', 'ja'）
   * @returns BranchCrawlerインスタンス
   * @throws 未対応言語の場合はエラー
   */
  static create(lang: string): BranchCrawler {
    const CrawlerClass = crawlers[lang];
    if (!CrawlerClass) {
      const supported = Object.keys(crawlers).join(", ");
      throw new Error(`Unsupported language: ${lang}. Supported: ${supported}`);
    }
    return new CrawlerClass();
  }

  /**
   * 対応言語一覧を取得する
   * @returns 対応言語コードの配列
   */
  static getSupportedLanguages(): string[] {
    return Object.keys(crawlers);
  }
}
