# Subtask-003-03-03: タグ抽出本番化

## 概要

PoCのタグ抽出を本番運用向けに拡張する。
タグ辞書マネージャーと連携し、バッチ処理、ステータス管理、コスト最適化を実装する。

## ユーザーストーリー

**As a** 開発者
**I want** タグ辞書と連携した本番品質のタグ抽出を行う
**So that** 表記揺れのない正規化されたタグを効率的に抽出できる

## Acceptance Criteria（EARS記法）

### タグ辞書連携

- [ ] WHEN タグ抽出プロンプトを生成した際
      GIVEN タグ辞書マネージャーが利用可能な場合
      THEN 辞書から動的にタグ選択肢を生成する
      AND ハードコードされた選択肢は使用しない

- [ ] WHEN LLMがタグを出力した際
      GIVEN 抽出結果がある場合
      THEN タグ辞書マネージャーで正規化する
      AND 正規化できないタグは警告を出力してスキップする

### ステータス管理

- [ ] WHEN タグ抽出処理を開始した際
      GIVEN 未処理記事がある場合
      THEN `tagging_status: 'pending'` の記事を取得する
      AND 処理開始時に `tagging_status: 'processing'` に更新する

- [ ] WHEN タグ抽出が成功した際
      GIVEN LLMが正常に応答した場合
      THEN `tagging_status: 'completed'` に更新する
      AND 抽出されたタグを `article_tags` テーブルに保存する

- [ ] WHEN タグ抽出が失敗した際
      GIVEN 3回のリトライ後も失敗した場合
      THEN `tagging_status: 'error'` に更新する
      AND リトライキューに追加する

### バッチ処理

- [ ] WHILE バッチ処理が実行中
      THE SYSTEM SHALL 適切なバッチサイズ（5件）で順次処理する
      AND バッチ間に適切な遅延を挿入する
      AND 進捗を定期的に出力する

- [ ] WHEN コスト見積もりを行う際
      GIVEN 処理対象の記事数がわかる場合
      THEN 予想トークン数とコストを計算する
      AND gpt-4o-mini の料金で計算する（入力: $0.15/1M, 出力: $0.60/1M）

### 既存タグの更新

- [ ] WHEN 記事のタグを更新した際
      GIVEN 既存のタグが存在する場合
      THEN 既存の `article_tags` レコードを削除する
      AND 新しいタグで置き換える

## 設計

### インターフェース

```typescript
// packages/poc/src/tagging/batch-processor.ts

export interface BatchTaggingOptions {
  batchSize?: number;        // デフォルト: 5
  costLimit?: number;        // USD上限（オプション）
  dryRun?: boolean;          // ドライランモード
  onProgress?: (progress: TaggingProgress) => void;
}

export interface TaggingProgress {
  processed: number;
  total: number;
  succeeded: number;
  failed: number;
  currentTokens: number;
  estimatedCost: number;
}

export interface BatchTaggingResult {
  processed: number;
  succeeded: number;
  failed: number;
  totalTokens: number;
  actualCost: number;
  duration: number;
  unknownTags: UnknownTag[];  // 正規化できなかったタグ
  errors: TaggingError[];
}

export interface UnknownTag {
  articleId: string;
  category: string;
  rawTag: string;
}
```

### 処理フロー

```typescript
export class BatchTaggingProcessor {
  constructor(
    private tagDictionaryManager: TagDictionaryManager,
    private llmClient: LLMClient
  ) {}

  async process(options: BatchTaggingOptions): Promise<BatchTaggingResult> {
    // 1. タグ辞書からプロンプト選択肢を生成
    const promptChoices = await this.tagDictionaryManager.generatePromptChoices();

    // 2. 未処理記事を取得
    const pendingArticles = await this.getPendingArticles();

    // 3. コスト見積もり
    const estimate = this.estimateCost(pendingArticles);

    // 4. バッチ処理実行
    for (const batch of this.chunk(pendingArticles, options.batchSize)) {
      for (const article of batch) {
        await this.processArticle(article, promptChoices);
      }
    }

    return this.createResult();
  }

  private async processArticle(article: Article, promptChoices: string): Promise<void> {
    // 1. LLM呼び出し
    const rawTags = await this.extractTags(article.content, promptChoices);

    // 2. タグ正規化
    const normalizedTags = await this.normalizeTags(rawTags);

    // 3. DB保存
    await this.saveTags(article.id, normalizedTags);
  }

  private async normalizeTags(rawTags: RawTags): Promise<NormalizedTags> {
    const result: NormalizedTags = {
      object_class: null,
      genre: [],
      theme: [],
      format: null,
    };

    // object_class
    if (rawTags.object_class) {
      result.object_class = await this.tagDictionaryManager.normalize(
        'object_class',
        rawTags.object_class
      );
    }

    // genre（複数）
    for (const tag of rawTags.genre || []) {
      const normalized = await this.tagDictionaryManager.normalize('genre', tag);
      if (normalized) result.genre.push(normalized);
    }

    // ... 他のカテゴリも同様

    return result;
  }
}
```

### 出力例

```
🏷️ バッチタグ抽出開始

📊 コスト見積もり:
  対象記事: 7000件
  推定入力トークン: 63,000,000
  推定出力トークン: 700,000
  推定コスト: $9.87

⏳ 処理中...
  [====================] 1000/7000 (14%)
  成功: 995件, 失敗: 5件

⚠️ 未知のタグ検出:
  - SCP-1234: genre/psychological (辞書になし)
  - SCP-2345: theme/temporal-loop (辞書になし)

...

✅ バッチタグ抽出完了
  処理: 7000件
  成功: 6950件
  失敗: 50件
  トークン: 入力 62,500,000 / 出力 680,000
  コスト: $9.78
  処理時間: 2時間15分

⚠️ 未知のタグ合計: 25件（レポート出力済み）
```

## テストケース

- [ ] タグ辞書から動的にプロンプトが生成される
- [ ] 未処理記事（`tagging_status: 'pending'`）が正しく取得される
- [ ] 処理開始時にステータスが 'processing' に更新される
- [ ] 成功時にステータスが 'completed' に更新される
- [ ] 抽出されたタグが正規化される
- [ ] 正規化されたタグが `article_tags` に保存される
- [ ] 既存タグが正しく置き換えられる
- [ ] 未知のタグで警告が出力される
- [ ] コスト見積もりが正しく計算される
- [ ] 失敗時にリトライキューに追加される
