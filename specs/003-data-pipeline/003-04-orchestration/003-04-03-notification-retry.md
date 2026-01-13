# Subtask-003-04-03: 通知・リトライ機能

## 概要

パイプライン実行結果の通知とリトライキューの処理機能を実装する。
失敗した記事の自動再処理、実行サマリーの通知を含む。

## ユーザーストーリー

**As a** 運用者
**I want** 実行結果の通知と失敗記事の自動リトライを行う
**So that** 問題を早期に発見し、データの完全性を維持できる

## Acceptance Criteria（EARS記法）

### リトライキュー処理

- [ ] WHEN リトライ処理を実行した際
      GIVEN リトライキューに記事がある場合
      THEN `next_retry_at <= 現在時刻` の記事を取得する
      AND 該当タスク（embedding/tagging）を再実行する

- [ ] WHEN リトライが成功した際
      GIVEN 処理が正常に完了した場合
      THEN リトライキューからレコードを削除する
      AND 記事のステータスを 'completed' に更新する

- [ ] WHEN リトライが失敗した際
      GIVEN 処理が再度失敗した場合
      THEN `retry_count` をインクリメントする
      AND `next_retry_at` をエクスポネンシャルバックオフで更新する
      AND `last_error` にエラーメッセージを保存する

- [ ] WHEN 最大リトライ回数に達した際
      GIVEN `retry_count >= max_retries` の場合
      THEN リトライキューからレコードを削除する
      AND 記事のステータスを 'error' のまま維持する
      AND 永続エラーとしてログ出力する

### エクスポネンシャルバックオフ

- [ ] WHEN 次回リトライ時刻を計算した際
      GIVEN リトライ回数に応じて
      THEN 以下の遅延を設定する：- 1回目失敗: 1時間後 - 2回目失敗: 4時間後 - 3回目失敗: 16時間後

### 実行サマリー通知

- [ ] WHEN パイプライン実行が完了した際
      GIVEN 通知設定が有効な場合
      THEN 実行サマリーをメールで送信する
      AND 以下の情報を含む：- 実行モード - 処理件数（成功/失敗）- コスト - 実行時間 - エラーがある場合はエラーサマリー

- [ ] WHEN 失敗件数が閾値を超えた際
      GIVEN 失敗率が10%を超えた場合
      THEN 警告レベルの通知を送信する
      AND 件名に "[WARNING]" を付加する

### リトライレポート

- [ ] WHEN リトライ処理が完了した際
      GIVEN リトライキューに処理した記事がある場合
      THEN リトライ結果のレポートを出力する
      AND 成功/失敗/最大リトライ到達の件数を表示する

## 設計

### リトライ処理

```typescript
// packages/poc/src/pipeline/retry-processor.ts

export interface RetryProcessorOptions {
  batchSize?: number; // デフォルト: 10
  maxRetries?: number; // デフォルト: 3
}

export interface RetryResult {
  processed: number;
  succeeded: number;
  failed: number;
  exhausted: number; // 最大リトライ到達
}

export class RetryProcessor {
  private readonly BACKOFF_BASE_HOURS = 1; // 1時間

  async processRetryQueue(options: RetryProcessorOptions = {}): Promise<RetryResult> {
    const pendingRetries = await this.getPendingRetries();
    const result: RetryResult = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      exhausted: 0,
    };

    for (const retry of pendingRetries) {
      result.processed++;

      try {
        if (retry.task_type === "embedding") {
          await this.retryEmbedding(retry.article_id);
        } else {
          await this.retryTagging(retry.article_id);
        }

        // 成功: キューから削除
        await this.removeFromQueue(retry.id);
        result.succeeded++;
      } catch (error) {
        // 失敗: リトライカウント更新
        const newRetryCount = retry.retry_count + 1;

        if (newRetryCount >= (options.maxRetries ?? 3)) {
          // 最大リトライ到達
          await this.removeFromQueue(retry.id);
          result.exhausted++;
          console.error(`❌ 最大リトライ到達: ${retry.article_id} (${retry.task_type})`);
        } else {
          // 次回リトライをスケジュール
          const nextRetryAt = this.calculateNextRetry(newRetryCount);
          await this.updateRetryQueue(retry.id, {
            retry_count: newRetryCount,
            next_retry_at: nextRetryAt,
            last_error: error.message,
          });
          result.failed++;
        }
      }
    }

    return result;
  }

  private calculateNextRetry(retryCount: number): Date {
    // エクスポネンシャルバックオフ: 1h, 4h, 16h
    const hoursToWait = this.BACKOFF_BASE_HOURS * Math.pow(4, retryCount - 1);
    return new Date(Date.now() + hoursToWait * 60 * 60 * 1000);
  }
}
```

### 通知サービス

```typescript
// packages/poc/src/pipeline/notification-service.ts

export interface NotificationConfig {
  enabled: boolean;
  email?: string;
  warningThreshold?: number; // 失敗率% (デフォルト: 10)
}

export interface PipelineSummary {
  runId: string;
  mode: string;
  status: "completed" | "failed";
  stats: PipelineStats;
  errors: PipelineError[];
}

export class NotificationService {
  async sendPipelineSummary(summary: PipelineSummary): Promise<void> {
    const failureRate = this.calculateFailureRate(summary.stats);
    const isWarning = failureRate > (this.config.warningThreshold ?? 10);

    const subject = this.buildSubject(summary, isWarning);
    const body = this.buildBody(summary);

    await this.sendEmail({
      to: this.config.email,
      subject,
      body,
    });
  }

  private buildSubject(summary: PipelineSummary, isWarning: boolean): string {
    const prefix = isWarning ? "[WARNING] " : "";
    const status = summary.status === "completed" ? "Success" : "FAILED";
    return `${prefix}[SCP Pipeline] ${status} - ${summary.mode}`;
  }

  private buildBody(summary: PipelineSummary): string {
    return `
SCP Data Pipeline 実行結果
==========================

実行ID: ${summary.runId}
モード: ${summary.mode}
ステータス: ${summary.status}

📊 処理統計:
${this.formatStats(summary.stats)}

${summary.errors.length > 0 ? this.formatErrors(summary.errors) : ""}

詳細: ${this.getRunUrl(summary.runId)}
    `.trim();
  }
}
```

### 出力例

```
🔄 リトライキュー処理開始

📋 リトライ対象: 15件
  - embedding: 5件
  - tagging: 10件

⏳ 処理中...
  ✅ SCP-1234 (embedding): 成功
  ✅ SCP-2345 (tagging): 成功
  ❌ SCP-3456 (tagging): 失敗 (2/3回目)
  ...

📊 リトライ結果:
  処理: 15件
  成功: 12件
  失敗: 2件 (次回リトライ予定)
  最大リトライ到達: 1件

⚠️ 最大リトライ到達した記事:
  - SCP-9999 (tagging): Rate limit exceeded
```

## テストケース

- [ ] リトライキューから対象記事が取得される
- [ ] リトライ成功時にキューからレコードが削除される
- [ ] リトライ失敗時にカウントがインクリメントされる
- [ ] エクスポネンシャルバックオフで次回時刻が計算される
- [ ] 最大リトライ到達時にキューから削除される
- [ ] 実行サマリーがメールで送信される
- [ ] 失敗率が閾値を超えると警告通知になる
- [ ] リトライレポートが正しく出力される
