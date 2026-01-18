/**
 * パイプラインCLI
 * Subtask: 003-04-02
 *
 * GitHub Actionsから呼び出されるCLIエントリポイント。
 * オーケストレーターを初期化して実行する。
 *
 * 使用方法:
 *   pnpm --filter pipeline run pipeline --mode=<mode> [options]
 *
 * オプション:
 *   --mode=<mode>        実行モード (diff|full|embedding|tagging)
 *   --dry-run            ドライランモード（API呼び出しなし）
 *   --cost-limit=<n>     コスト上限（USD）
 *   --resume=<run-id>    中断した実行から再開
 *   --help               ヘルプを表示
 */

import { parseArgs } from "node:util";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { PipelineOrchestrator } from "../src/orchestrator/orchestrator";
import type { PipelineMode } from "../src/orchestrator/types";
import { FullCrawler } from "../src/crawler/full-crawler";
import { DiffCrawler } from "../src/crawler/diff-crawler";
import { EnglishCrawler } from "../src/crawler/english-crawler";
import {
  DiffDbOperations,
  type ExtendedSupabaseClient,
} from "../src/crawler/utils/diff-db-operations";
import { BatchEmbeddingProcessor } from "../src/processing/batch-embedding";
import { BatchTaggingProcessor } from "../src/processing/batch-tagging";
import type { SupabaseClient as FullCrawlerSupabaseClient } from "../src/crawler/utils/db-saver";
import { TagDictionaryManagerImpl } from "@recommend-scp/shared/tagging";
import { createLogger } from "../src/crawler/utils/logger";

// ロガー初期化
const logger = createLogger({ prefix: "[Pipeline CLI]" });

// コマンドライン引数のパース
const { values } = parseArgs({
  options: {
    mode: { type: "string", short: "m", default: "diff" },
    "dry-run": { type: "boolean", default: false },
    "cost-limit": { type: "string" },
    resume: { type: "string" },
    help: { type: "boolean", short: "h" },
  },
});

// ヘルプ表示
if (values.help === true) {
  console.log(`
パイプラインCLI

使用方法:
  pnpm --filter pipeline run pipeline --mode=<mode> [options]

オプション:
  --mode=<mode>        実行モード (diff|full|embedding|tagging)
                       デフォルト: diff
  --dry-run            ドライランモード（API呼び出しなし）
  --cost-limit=<n>     コスト上限（USD）
  --resume=<run-id>    中断した実行から再開
  --help, -h           ヘルプを表示

例:
  # 差分クロールを実行
  pnpm --filter pipeline run pipeline --mode=diff

  # フルクロール（ドライラン）
  pnpm --filter pipeline run pipeline --mode=full --dry-run

  # コスト上限付きでEmbeddingを実行
  pnpm --filter pipeline run pipeline --mode=embedding --cost-limit=5
  `);
  process.exit(0);
}

// 環境変数チェック
function checkEnvVars(): void {
  const required = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "OPENAI_API_KEY"];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    logger.error(`環境変数が未設定: ${missing.join(", ")}`);
    process.exit(1);
  }
}

// モードのバリデーション
function validateMode(mode: string): PipelineMode {
  const validModes: PipelineMode[] = ["diff", "full", "embedding", "tagging"];
  if (!validModes.includes(mode as PipelineMode)) {
    logger.error(`無効なモード: ${mode}`);
    logger.error(`有効なモード: ${validModes.join(", ")}`);
    process.exit(1);
  }
  return mode as PipelineMode;
}

// メイン関数
async function main(): Promise<void> {
  checkEnvVars();

  // checkEnvVarsで環境変数の存在を確認済み
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("環境変数が設定されていません");
  }

  const mode = validateMode(values.mode);
  const dryRun = values["dry-run"];
  const costLimit = values["cost-limit"] ? parseFloat(values["cost-limit"]) : undefined;
  const resumeFromRun = values.resume;

  logger.info("パイプラインCLI起動");
  logger.info(`  モード: ${mode}`);
  logger.info(`  ドライラン: ${String(dryRun)}`);
  if (costLimit !== undefined) {
    logger.info(`  コスト上限: $${costLimit.toFixed(2)}`);
  }
  if (resumeFromRun) {
    logger.info(`  再開元: ${resumeFromRun}`);
  }

  // Supabaseクライアント初期化
  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  // OpenAIクライアント初期化
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  // 依存関係の初期化
  // 型アサーション：Supabase v2で型定義が変更されたため必要
  const supabaseForDiffDb = supabase as unknown as ExtendedSupabaseClient;
  const supabaseForFullCrawler = supabase as unknown as FullCrawlerSupabaseClient;

  const englishCrawler = new EnglishCrawler();
  const dbOperations = new DiffDbOperations(supabaseForDiffDb);

  const fullCrawler = new FullCrawler({
    supabaseClient: supabaseForFullCrawler,
    dryRun,
  });

  const diffCrawler = new DiffCrawler(englishCrawler, dbOperations);

  const embeddingProcessor = new BatchEmbeddingProcessor({
    supabaseClient: supabase,
    openaiClient: openai,
  });

  const tagDictionaryManager = new TagDictionaryManagerImpl(supabase);

  const taggingProcessor = new BatchTaggingProcessor({
    supabaseClient: supabase,
    openaiClient: openai,
    tagDictionaryManager,
  });

  // オーケストレーター初期化
  const orchestrator = new PipelineOrchestrator({
    supabaseClient: supabase,
    fullCrawler,
    diffCrawler,
    embeddingProcessor,
    taggingProcessor,
    logger: createLogger({ prefix: "[Orchestrator]" }),
  });

  // パイプライン実行
  const result = await orchestrator.run({
    mode,
    dryRun,
    costLimit,
    resumeFromRun,
  });

  // 結果出力
  logger.info("パイプライン実行結果:");
  logger.info(`  ステータス: ${result.status}`);
  logger.info(`  実行ID: ${result.runId}`);
  logger.info(`  合計コスト: $${result.totalCost.toFixed(4)}`);
  logger.info(`  所要時間: ${String(Math.round(result.duration / 1000))}秒`);

  if (result.status === "failed") {
    logger.error(`エラー: ${result.error ?? "不明なエラー"}`);
    process.exit(1);
  }
}

// 実行
main().catch((error: unknown) => {
  logger.error("予期しないエラー:", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
