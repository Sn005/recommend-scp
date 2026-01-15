/**
 * EN全記事フルクローラー
 * Subtask: 003-02-02
 *
 * レート制限、チェックポイント、リトライ機能を含むフルクロール機能を提供
 */

import { EnglishCrawler } from "./english-crawler";
import { fetchWithRetry } from "./utils/retry";
import { RateLimiter } from "./utils/rate-limiter";
import { CheckpointManager } from "./utils/checkpoint-manager";
import type { SupabaseClient } from "./utils/db-saver";
import { DbSaver } from "./utils/db-saver";
import type {
  ArticleIndex,
  BranchCrawler,
  Checkpoint,
  CrawlProgress,
  CrawlResult,
  FullCrawlOptions,
} from "./types";

/** フルクローラーオプション */
export interface FullCrawlerOptions extends FullCrawlOptions {
  /** Supabaseクライアント（dryRun: false時に必須） */
  supabaseClient?: SupabaseClient;
  /** カスタムクローラー（テスト用） */
  crawler?: BranchCrawler;
}

/** デフォルト設定 */
const DEFAULT_OPTIONS = {
  batchSize: 10,
  batchDelayMs: 1000,
  checkpointInterval: 100,
  maxRetries: 3,
  dryRun: true,
};

/**
 * EN全記事フルクローラー
 */
export class FullCrawler {
  private readonly crawler: BranchCrawler;
  private readonly rateLimiter: RateLimiter;
  private readonly checkpointManager: CheckpointManager;
  private readonly dbSaver: DbSaver | null;
  private readonly options: Required<
    Pick<FullCrawlerOptions, "batchSize" | "checkpointInterval" | "dryRun">
  > &
    FullCrawlerOptions;

  constructor(options: FullCrawlerOptions = {}) {
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options,
    };

    // カスタムクローラーがあればそれを使用、なければEnglishCrawlerを作成
    this.crawler = options.crawler ?? new EnglishCrawler();

    this.rateLimiter = new RateLimiter({
      batchSize: this.options.batchSize,
      batchDelayMs: this.options.batchSize ? 1000 : 1000,
      onRateLimit: (seconds) => {
        // eslint-disable-next-line no-console
        console.log(`⏳ レート制限: ${String(seconds)}秒待機中...`);
      },
    });

    this.checkpointManager = new CheckpointManager({
      interval: this.options.checkpointInterval,
      onCheckpoint: (checkpoint) => {
        this.options.onCheckpoint?.(checkpoint);
        // eslint-disable-next-line no-console
        console.log(`💾 チェックポイント保存: ${checkpoint.lastProcessedId}`);
      },
    });

    // DB保存はdryRunでない場合のみ
    if (!this.options.dryRun && this.options.supabaseClient) {
      this.dbSaver = new DbSaver(this.options.supabaseClient, {
        lang: "en",
        onError: (id, error) => {
          // eslint-disable-next-line no-console
          console.error(`❌ DB保存エラー (${id}): ${error.message}`);
        },
      });
    } else {
      this.dbSaver = null;
    }
  }

  /**
   * 全記事一覧を取得
   */
  async fetchAllArticles(): Promise<ArticleIndex[]> {
    // eslint-disable-next-line no-console
    console.log("📥 記事一覧を取得中...");

    const articles = await this.crawler.fetchArticleList();

    // eslint-disable-next-line no-console
    console.log(`📋 ${String(articles.length)}件の記事を発見`);

    // 重複チェック
    const ids = articles.map((a) => a.id);
    const uniqueIds = new Set(ids);
    if (ids.length !== uniqueIds.size) {
      // eslint-disable-next-line no-console
      console.warn(`⚠️ ${String(ids.length - uniqueIds.size)}件の重複を検出`);
    }

    return articles;
  }

  /**
   * フルクロールを実行
   */
  async runFullCrawl(): Promise<CrawlResult> {
    const startTime = Date.now();

    // eslint-disable-next-line no-console
    console.log("🚀 EN全記事クロール開始");
    if (this.options.dryRun) {
      // eslint-disable-next-line no-console
      console.log("⚠️ ドライランモード（DBに保存しません）");
    }

    // 記事一覧取得
    const articles = await this.fetchAllArticles();

    // チェックポイントからの再開処理
    const resumeIndex = this.checkpointManager.getResumeIndex(
      articles.map((a) => a.id),
      this.options.resumeFromCheckpoint ?? null
    );

    if (resumeIndex > 0) {
      // eslint-disable-next-line no-console
      console.log(`📍 ${String(resumeIndex)}件目から再開`);
    }

    const articlesToProcess = articles.slice(resumeIndex);
    const totalCount = articlesToProcess.length;

    // 結果の初期化
    const result: CrawlResult = {
      successCount: 0,
      failedCount: 0,
      failedIds: [],
      durationMs: 0,
    };

    // 進捗通知
    const notifyProgress = (phase: CrawlProgress["phase"], current: number) => {
      this.options.onProgress?.({
        phase,
        current,
        total: totalCount,
      });
    };

    notifyProgress("fetch_index", 0);

    // バッチ処理で本文取得
    let processedCount = resumeIndex;
    let lastCheckpoint: Checkpoint | undefined;

    // eslint-disable-next-line no-console
    console.log(`📖 本文取得開始: ${String(totalCount)}件`);

    await this.rateLimiter.processInBatches(
      articlesToProcess,
      async (article) => {
        try {
          // リトライ付きで本文取得
          const content = await fetchWithRetry(() => this.crawler.fetchArticleContent(article.id), {
            maxRetries: 3,
            onRetry: (attempt, error) => {
              // eslint-disable-next-line no-console
              console.warn(`⚠️ リトライ ${String(attempt)}/3: ${article.id} - ${error.message}`);
            },
          });

          // DB保存
          if (this.dbSaver) {
            await this.dbSaver.saveArticle(content);
          }

          result.successCount++;
        } catch (error) {
          result.failedCount++;
          result.failedIds.push(article.id);
          // eslint-disable-next-line no-console
          console.error(
            `❌ 取得失敗: ${article.id} - ${error instanceof Error ? error.message : String(error)}`
          );
        }

        processedCount++;
        notifyProgress("fetch_content", processedCount - resumeIndex);

        // チェックポイント保存
        const checkpoint = this.checkpointManager.maybeCreateCheckpoint(article.id, processedCount);
        if (checkpoint) {
          lastCheckpoint = checkpoint;
        }

        return article.id;
      },
      {
        onProgress: (current, total) => {
          if (current % 50 === 0 || current === total) {
            // eslint-disable-next-line no-console
            console.log(
              `📊 進捗: ${String(current)}/${String(total)} (${String(Math.round((current / total) * 100))}%)`
            );
          }
        },
      }
    );

    result.lastCheckpoint = lastCheckpoint;
    result.durationMs = Date.now() - startTime;

    // 完了メッセージ
    // eslint-disable-next-line no-console
    console.log(`
✅ クロール完了
  取得: ${String(totalCount)}件
  成功: ${String(result.successCount)}件
  失敗: ${String(result.failedCount)}件
  所要時間: ${String(Math.round(result.durationMs / 1000))}秒
    `);

    return result;
  }
}
