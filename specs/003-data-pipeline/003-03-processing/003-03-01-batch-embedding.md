# Subtask-003-03-01: バッチEmbedding処理

## 概要

大規模なEmbedding生成をバッチ処理で効率的に実行する。
ステータス管理、コスト見積もり、進捗表示、リトライ機能を実装する。

## ユーザーストーリー

**As a** 開発者
**I want** 大量の記事のEmbeddingを効率的に生成する
**So that** コストを抑えながら全記事のベクトル化ができる

## Acceptance Criteria（EARS記法）

### ステータス管理

- [ ] WHEN バッチ処理を開始した際
      GIVEN 未処理記事がある場合
      THEN `embedding_status: 'pending'` の記事を取得する
      AND 処理開始時に `embedding_status: 'processing'` に更新する

- [ ] WHEN Embedding生成が成功した際
      GIVEN APIが正常に応答した場合
      THEN `embedding_status: 'completed'` に更新する
      AND `last_processed_at` に現在時刻を設定する
      AND embedding ベクトルをDBに保存する

- [ ] WHEN Embedding生成が失敗した際
      GIVEN 3回のリトライ後も失敗した場合
      THEN `embedding_status: 'error'` に更新する
      AND リトライキューに追加する

### コスト見積もり

- [ ] WHEN バッチ処理を開始する前に
      GIVEN 処理対象の記事数がわかる場合
      THEN 予想トークン数を計算する
      AND 予想コスト（USD）を表示する
      AND コスト上限が設定されている場合は超過時に確認プロンプトを表示する

- [ ] WHEN バッチ処理が完了した際
      GIVEN 処理が正常に完了した場合
      THEN 実際のトークン数と実コストを出力する

### バッチ処理最適化

- [ ] WHILE バッチ処理が実行中
      THE SYSTEM SHALL 適切なバッチサイズ（10件）で並列処理する
      AND バッチ間に1秒の遅延を挿入する
      AND レート制限時はエクスポネンシャルバックオフで待機する

- [ ] WHEN 進捗を表示する際
      GIVEN 処理が進行中の場合
      THEN 処理済み件数/全件数を表示する
      AND 推定残り時間を表示する

### ドライラン

- [ ] WHEN ドライランモードで実行した際
      GIVEN `dryRun: true` が設定された場合
      THEN API呼び出しを行わない
      AND 推定トークン数とコストのみを計算して出力する

## 設計

### インターフェース

```typescript
// packages/poc/src/embedding/batch-processor.ts

export interface BatchEmbeddingOptions {
  batchSize?: number;        // デフォルト: 10
  costLimit?: number;        // USD上限（オプション）
  dryRun?: boolean;          // ドライランモード
  onProgress?: (progress: EmbeddingProgress) => void;
}

export interface EmbeddingProgress {
  processed: number;
  total: number;
  succeeded: number;
  failed: number;
  currentTokens: number;
  estimatedCost: number;
  estimatedTimeRemaining: number;  // 秒
}

export interface BatchEmbeddingResult {
  processed: number;
  succeeded: number;
  failed: number;
  totalTokens: number;
  actualCost: number;
  duration: number;  // ミリ秒
  errors: EmbeddingError[];
}
```

### 処理フロー

```typescript
export class BatchEmbeddingProcessor {
  async process(options: BatchEmbeddingOptions): Promise<BatchEmbeddingResult> {
    // 1. 未処理記事を取得
    const pendingArticles = await this.getPendingArticles();

    // 2. コスト見積もり
    const estimate = this.estimateCost(pendingArticles);
    console.log(`📊 コスト見積もり: ${estimate.tokens}トークン, $${estimate.cost}`);

    // 3. コスト上限チェック
    if (options.costLimit && estimate.cost > options.costLimit) {
      throw new Error(`コスト上限超過: $${estimate.cost} > $${options.costLimit}`);
    }

    // 4. ドライラン
    if (options.dryRun) {
      return this.createDryRunResult(estimate);
    }

    // 5. バッチ処理実行
    return this.processBatches(pendingArticles, options);
  }
}
```

### 出力例

```
🔢 バッチEmbedding処理開始

📊 コスト見積もり:
  対象記事: 7000件
  推定トークン: 56,000,000
  推定コスト: $1.12

⏳ 処理中...
  [====================] 1000/7000 (14%)
  成功: 998件, 失敗: 2件
  トークン: 8,000,000
  残り時間: 約30分

💾 チェックポイント保存: 1000件処理完了

...

✅ バッチEmbedding完了
  処理: 7000件
  成功: 6980件
  失敗: 20件
  トークン: 55,840,000
  コスト: $1.12
  処理時間: 45分
```

## テストケース

- [ ] 未処理記事（`embedding_status: 'pending'`）が正しく取得される
- [ ] 処理開始時にステータスが 'processing' に更新される
- [ ] 成功時にステータスが 'completed' に更新される
- [ ] 失敗時にステータスが 'error' に更新される
- [ ] コスト見積もりが正しく計算される
- [ ] コスト上限超過時にエラーがスローされる
- [ ] ドライランモードでAPI呼び出しが行われない
- [ ] 進捗が正しく表示される
- [ ] リトライキューに失敗記事が追加される
