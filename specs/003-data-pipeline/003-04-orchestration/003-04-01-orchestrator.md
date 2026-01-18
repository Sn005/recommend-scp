# Subtask-003-04-01: パイプラインオーケストレーター

## 概要

クロール、Embedding生成、タグ抽出を統合実行するオーケストレーターを実装する。
実行モード切り替え、コスト制御、進捗ログ、実行履歴管理を含む。

## ユーザーストーリー

**As a** 開発者/運用者
**I want** パイプライン全体を一括で実行する
**So that** 個別コンポーネントを手動で実行する必要がなくなる

## Acceptance Criteria（EARS記法）

### 実行モード

- [x] WHEN パイプラインを実行した際
      GIVEN `mode: 'full'` が指定された場合
      THEN フルクロール → Embedding → タグ抽出 の順に実行する

- [x] WHEN パイプラインを実行した際
      GIVEN `mode: 'diff'` が指定された場合
      THEN 差分クロール → Embedding → タグ抽出 の順に実行する
      AND 新規/更新記事のみを処理する

- [x] WHEN パイプラインを実行した際
      GIVEN `mode: 'embedding'` が指定された場合
      THEN Embeddingのみを実行する（クロールをスキップ）

- [x] WHEN パイプラインを実行した際
      GIVEN `mode: 'tagging'` が指定された場合
      THEN タグ抽出のみを実行する（クロール・Embeddingをスキップ）

### 実行履歴管理

- [x] WHEN パイプラインを開始した際
      GIVEN 正常に開始できる場合
      THEN `pipeline_runs` テーブルに実行レコードを作成する
      AND `status: 'running'` を設定する

- [x] WHEN パイプラインが完了した際
      GIVEN 正常に完了した場合
      THEN `status: 'completed'` に更新する
      AND 処理統計（stats）を保存する

- [x] WHEN パイプラインが失敗した際
      GIVEN エラーが発生した場合
      THEN `status: 'failed'` に更新する
      AND エラーメッセージを保存する

### コスト制御

- [x] WHEN コスト上限が設定された際
      GIVEN `costLimit` オプションが指定された場合
      THEN 処理開始前にコスト見積もりを計算する
      AND 上限超過時はエラーをスローする

- [x] WHEN 処理中にコストを監視した際
      GIVEN 実行中のコストが上限の90%に達した場合
      THEN 警告ログを出力する

### 進捗ログ

- [x] WHILE パイプラインが実行中
      THE SYSTEM SHALL 各フェーズの開始・終了をログ出力する
      AND 処理件数と経過時間を表示する

### チェックポイント

- [x] WHILE 各フェーズが実行中
      THE SYSTEM SHALL 定期的にチェックポイントを `pipeline_runs.checkpoint` に保存する

- [x] WHEN パイプラインを再開した際
      GIVEN 前回の実行が中断された場合
      THEN チェックポイントから処理を再開する

## 設計

### インターフェース

```typescript
// packages/pipeline/src/orchestrator/orchestrator.ts

export type PipelineMode = "full" | "diff" | "embedding" | "tagging";

export interface PipelineConfig {
  mode: PipelineMode;
  lang?: string; // デフォルト: 'en'
  costLimit?: number; // USD上限
  dryRun?: boolean; // ドライランモード
  resumeFromRun?: string; // 再開する実行ID
}

export interface PipelineResult {
  runId: string;
  mode: PipelineMode;
  status: "completed" | "failed";
  crawl?: CrawlResult;
  embedding?: BatchEmbeddingResult;
  tagging?: BatchTaggingResult;
  totalCost: number;
  duration: number; // ミリ秒
  error?: string;
}

export interface PipelineStats {
  crawl?: {
    newCount: number;
    updatedCount: number;
    deletedCount: number;
  };
  embedding?: {
    processed: number;
    succeeded: number;
    failed: number;
    tokens: number;
    cost: number;
  };
  tagging?: {
    processed: number;
    succeeded: number;
    failed: number;
    tokens: number;
    cost: number;
  };
  totalCost: number;
  duration: number;
}
```

### 実装

```typescript
export class PipelineOrchestrator {
  async run(config: PipelineConfig): Promise<PipelineResult> {
    const runId = await this.createPipelineRun(config);

    try {
      // 1. コスト見積もり
      if (config.costLimit) {
        await this.checkCostLimit(config);
      }

      // 2. クロール
      let crawlResult: CrawlResult | undefined;
      if (config.mode === 'full' || config.mode === 'diff') {
        console.log('📥 クロール開始...');
        crawlResult = await this.runCrawl(config);
        await this.updateCheckpoint(runId, 'crawl_completed', crawlResult);
      }

      // 3. Embedding
      let embeddingResult: BatchEmbeddingResult | undefined;
      if (config.mode !== 'tagging') {
        console.log('🔢 Embedding生成開始...');
        embeddingResult = await this.runEmbedding(config);
        await this.updateCheckpoint(runId, 'embedding_completed', embeddingResult);
      }

      // 4. タグ抽出
      let taggingResult: BatchTaggingResult | undefined;
      if (config.mode !== 'embedding') {
        console.log('🏷️ タグ抽出開始...');
        taggingResult = await this.runTagging(config);
        await this.updateCheckpoint(runId, 'tagging_completed', taggingResult);
      }

      // 5. 完了
      await this.completePipelineRun(runId, 'completed', {
        crawl: crawlResult,
        embedding: embeddingResult,
        tagging: taggingResult,
      });

      return { runId, status: 'completed', ... };

    } catch (error) {
      await this.completePipelineRun(runId, 'failed', null, error.message);
      throw error;
    }
  }
}
```

### CLI

```bash
# フルパイプライン
pnpm --filter pipeline run --mode=full

# 差分更新
pnpm --filter pipeline run --mode=diff

# Embeddingのみ
pnpm --filter pipeline run --mode=embedding

# コスト上限付き
pnpm --filter pipeline run --mode=diff --cost-limit=5

# ドライラン
pnpm --filter pipeline run --mode=full --dry-run

# 前回実行から再開
pnpm --filter pipeline run --resume=<run-id>
```

### 出力例

```
🚀 パイプライン開始
  モード: diff
  言語: en
  コスト上限: $5.00
  実行ID: 550e8400-e29b-41d4-a716-446655440000

📊 コスト見積もり:
  クロール: 無料
  Embedding: $0.02 (推定50件)
  タグ抽出: $0.14 (推定50件)
  合計: $0.16

📥 [1/3] クロール
  ✅ 新規: 30件, 更新: 15件, 削除: 5件
  所要時間: 2分30秒

🔢 [2/3] Embedding生成
  ✅ 処理: 45件, 成功: 45件, 失敗: 0件
  コスト: $0.02
  所要時間: 5分

🏷️ [3/3] タグ抽出
  ✅ 処理: 45件, 成功: 44件, 失敗: 1件
  コスト: $0.13
  所要時間: 15分

✅ パイプライン完了
  合計コスト: $0.15
  合計時間: 22分30秒
```

## テストケース

- [x] `mode: 'full'` で全フェーズが実行される
- [x] `mode: 'diff'` で差分クロールが使用される
- [x] `mode: 'embedding'` でEmbeddingのみ実行される
- [x] `mode: 'tagging'` でタグ抽出のみ実行される
- [x] 実行開始時に `pipeline_runs` レコードが作成される
- [x] 完了時にステータスと統計が更新される
- [x] 失敗時にエラーメッセージが保存される
- [x] コスト上限超過でエラーがスローされる
- [x] チェックポイントが正しく保存される
- [x] 中断した実行から再開できる

## 実装状況

- **status**: completed
- **実装ファイル**:
  - `packages/pipeline/src/orchestrator/orchestrator.ts`
  - `packages/pipeline/src/orchestrator/types.ts`
- **テストファイル**:
  - `packages/pipeline/src/orchestrator/__dev__/orchestrator.test.ts`
- **テスト結果**: 29/29 passed
