# Subtask-003-02-01: クローラー抽象化レイヤー

## 概要

将来の多言語支部対応を見据えて、クローラーを抽象化する。
共通インターフェース（`BranchCrawler`）を定義し、支部別実装を差し替え可能にする。

## ユーザーストーリー

**As a** 開発者
**I want** クローラーを抽象化する
**So that** 新しい言語支部を追加する際にクローラー実装を差し替えるだけで対応できる

## Acceptance Criteria（EARS記法）

### BranchCrawler インターフェース

- [x] WHEN クローラーモジュールを実装する際
      GIVEN 抽象化が必要な場合
      THEN `BranchCrawler` インターフェースを定義する
      AND 以下のメソッドを含む：- `fetchArticleList(): Promise<ArticleIndex[]>` - `fetchArticleContent(id: string): Promise<ArticleContent>` - `getLastModified(id: string): Promise<Date | null>`

- [x] WHEN インターフェースを定義した際
      GIVEN 言語情報が必要な場合
      THEN `readonly lang: string` プロパティを含む
      AND `readonly crawlerType: 'api' | 'scraping'` プロパティを含む

### Factory パターン

- [x] WHEN クローラーインスタンスを取得する際
      GIVEN 言語コードが指定された場合
      THEN `CrawlerFactory.create(lang)` で適切なクローラーが返される
      AND 'en' の場合は `EnglishCrawler` が返される

- [x] WHEN 未対応の言語が指定された際
      GIVEN 対応するクローラーがない場合
      THEN エラーがスローされる
      AND エラーメッセージに未対応言語が含まれる

### 型定義

- [x] WHEN 型定義を作成した際
      GIVEN クローラーで使用する型が必要な場合
      THEN `ArticleIndex` 型を定義する（id, title, url, series）
      AND `ArticleContent` 型を定義する（id, title, content, rating, tags, createdAt, updatedAt）
      AND `CrawlProgress` 型を定義する（phase, current, total）

## 設計

### インターフェース定義

```typescript
// packages/poc/src/crawler/types.ts

export interface ArticleIndex {
  id: string; // 'SCP-173'
  title: string; // 'The Sculpture'
  url: string; // 'https://scp-wiki.wikidot.com/scp-173'
  series: string; // 'series-1'
}

export interface ArticleContent {
  id: string;
  title: string;
  content: string;
  rating: number;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  sourceHash?: string; // コンテンツハッシュ（差分検出用）
}

export interface CrawlProgress {
  phase: "fetch_index" | "fetch_content" | "save_db";
  current: number;
  total: number;
}

export interface BranchCrawler {
  readonly lang: string;
  readonly crawlerType: "api" | "scraping";

  fetchArticleList(): Promise<ArticleIndex[]>;
  fetchArticleContent(id: string): Promise<ArticleContent>;
  getLastModified(id: string): Promise<Date | null>;
}
```

### Factory 実装

```typescript
// packages/poc/src/crawler/factory.ts

import { BranchCrawler } from "./types";
import { EnglishCrawler } from "./english-crawler";
// import { JapaneseCrawler } from './japanese-crawler';  // 将来追加

const crawlers: Record<string, new () => BranchCrawler> = {
  en: EnglishCrawler,
  // ja: JapaneseCrawler,  // 将来追加
};

export class CrawlerFactory {
  static create(lang: string): BranchCrawler {
    const CrawlerClass = crawlers[lang];
    if (!CrawlerClass) {
      throw new Error(
        `Unsupported language: ${lang}. Supported: ${Object.keys(crawlers).join(", ")}`
      );
    }
    return new CrawlerClass();
  }

  static getSupportedLanguages(): string[] {
    return Object.keys(crawlers);
  }
}
```

## テストケース

- [x] `BranchCrawler` インターフェースに必要なメソッドが定義されている
- [x] `CrawlerFactory.create('en')` で `EnglishCrawler` が返される
- [x] `CrawlerFactory.create('xx')` で未対応言語エラーがスローされる
- [x] `CrawlerFactory.getSupportedLanguages()` で対応言語一覧が取得できる
- [x] `ArticleIndex`, `ArticleContent` 型が正しく定義されている

## 実装状況

- **status**: completed
- **実装日**: 2026-01-13
- **実装ファイル**:
  - `packages/poc/src/crawler/types.ts` - 型定義
  - `packages/poc/src/crawler/factory.ts` - CrawlerFactory
  - `packages/poc/src/crawler/english-crawler.ts` - EnglishCrawler
  - `packages/poc/src/crawler/index.ts` - モジュールエクスポート
- **テストファイル**:
  - `packages/poc/src/crawler/__tests__/types.test.ts`
  - `packages/poc/src/crawler/__tests__/factory.test.ts`
  - `packages/poc/src/crawler/__tests__/english-crawler.test.ts`
- **テスト結果**: 28テスト全てパス
