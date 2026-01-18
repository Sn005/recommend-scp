/**
 * Subtask-003-01-03: パイプライン実行管理テーブル - スキーマ検証テスト
 *
 * このテストはSupabase接続が必要な統合テストです。
 * ローカルSupabaseまたはテスト環境で実行してください。
 *
 * 実行方法:
 *   pnpm test src/migrations/__dev__/003-01-03-pipeline-tables.test.ts
 */

import { describe, it, expect, afterAll, beforeAll } from "vitest";
import { createSupabaseAdmin } from "@recommend-scp/shared/lib/supabase";

// カラム情報の型定義
interface ColumnInfo {
  column_name: string;
  data_type: string;
  column_default: string | null;
  is_nullable: string;
}

// インデックス情報の型定義
interface IndexInfo {
  index_name: string;
  index_definition: string;
}

// pipeline_runs の型定義
interface PipelineRun {
  id: string;
  run_type: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  stats: Record<string, unknown>;
  error_message: string | null;
  checkpoint: Record<string, unknown> | null;
  created_at: string;
}

// retry_queue の型定義
interface RetryQueue {
  id: number;
  article_id: string;
  task_type: string;
  retry_count: number;
  max_retries: number;
  last_error: string | null;
  next_retry_at: string | null;
  created_at: string;
}

// RPC結果の型定義
interface RpcResult<T> {
  data: T | null;
  error: { message: string } | null;
}

// テスト用Supabaseクライアント
const supabase = createSupabaseAdmin();

// テスト用のIDを保持
const testPipelineRunIds: string[] = [];
const testRetryQueueIds: number[] = [];

// カラム情報取得用のヘルパー関数
async function getTableColumns(tableName: string): Promise<ColumnInfo[]> {
  const result = (await supabase.rpc("get_table_columns", {
    p_table_name: tableName,
  })) as RpcResult<ColumnInfo[]>;

  if (result.error) throw new Error(`カラム情報取得失敗: ${result.error.message}`);
  if (!result.data) throw new Error("カラム情報が取得されませんでした");
  return result.data;
}

// インデックス情報取得用のヘルパー関数
async function getTableIndexes(tableName: string): Promise<IndexInfo[]> {
  const result = (await supabase.rpc("get_table_indexes", {
    p_table_name: tableName,
  })) as RpcResult<IndexInfo[]>;

  if (result.error) throw new Error(`インデックス情報取得失敗: ${result.error.message}`);
  if (!result.data) throw new Error("インデックス情報が取得されませんでした");
  return result.data;
}

// テスト用記事IDを取得（外部キーテスト用）
let testArticleId: string | null = null;

beforeAll(async () => {
  // scp_articlesから既存のIDを取得
  const result = await supabase.from("scp_articles").select("id").limit(1).single();
  const data = result.data as { id: string } | null;
  if (data) {
    testArticleId = data.id;
  }
});

// テスト用データのクリーンアップ
afterAll(async () => {
  // テスト用に挿入したpipeline_runsを削除
  if (testPipelineRunIds.length > 0) {
    await supabase.from("pipeline_runs").delete().in("id", testPipelineRunIds);
  }

  // テスト用に挿入したretry_queueを削除
  if (testRetryQueueIds.length > 0) {
    await supabase.from("retry_queue").delete().in("id", testRetryQueueIds);
  }
});

describe("Subtask-003-01-03: パイプライン実行管理テーブル", () => {
  // ===========================================
  // AC1: pipeline_runs テーブル作成
  // ===========================================
  describe("AC1: pipeline_runs テーブル作成", () => {
    describe("テーブル構造", () => {
      it("テーブルが存在する", async () => {
        const { error } = await supabase.from("pipeline_runs").select("*").limit(0);

        expect(error).toBeNull();
      });

      it("id カラムが存在する（UUID型, PRIMARY KEY）", async () => {
        const columns = await getTableColumns("pipeline_runs");
        const column = columns.find((c) => c.column_name === "id");

        expect(column).toBeDefined();
        expect(column?.data_type).toBe("uuid");
      });

      it("run_type カラムが存在する（TEXT型, NOT NULL）", async () => {
        const columns = await getTableColumns("pipeline_runs");
        const column = columns.find((c) => c.column_name === "run_type");

        expect(column).toBeDefined();
        expect(column?.data_type).toBe("text");
        expect(column?.is_nullable).toBe("NO");
      });

      it("status カラムが存在する（TEXT型, NOT NULL, DEFAULT 'running'）", async () => {
        const columns = await getTableColumns("pipeline_runs");
        const column = columns.find((c) => c.column_name === "status");

        expect(column).toBeDefined();
        expect(column?.data_type).toBe("text");
        expect(column?.is_nullable).toBe("NO");
        expect(column?.column_default).toContain("running");
      });

      it("started_at カラムが存在する（TIMESTAMPTZ型）", async () => {
        const columns = await getTableColumns("pipeline_runs");
        const column = columns.find((c) => c.column_name === "started_at");

        expect(column).toBeDefined();
        expect(column?.data_type).toContain("timestamp");
      });

      it("completed_at カラムが存在する（TIMESTAMPTZ型, NULLABLE）", async () => {
        const columns = await getTableColumns("pipeline_runs");
        const column = columns.find((c) => c.column_name === "completed_at");

        expect(column).toBeDefined();
        expect(column?.data_type).toContain("timestamp");
        expect(column?.is_nullable).toBe("YES");
      });

      it("stats カラムが存在する（JSONB型, DEFAULT '{}'）", async () => {
        const columns = await getTableColumns("pipeline_runs");
        const column = columns.find((c) => c.column_name === "stats");

        expect(column).toBeDefined();
        expect(column?.data_type).toBe("jsonb");
        expect(column?.column_default).toContain("{}");
      });

      it("error_message カラムが存在する（TEXT型, NULLABLE）", async () => {
        const columns = await getTableColumns("pipeline_runs");
        const column = columns.find((c) => c.column_name === "error_message");

        expect(column).toBeDefined();
        expect(column?.data_type).toBe("text");
        expect(column?.is_nullable).toBe("YES");
      });

      it("checkpoint カラムが存在する（JSONB型, NULLABLE）", async () => {
        const columns = await getTableColumns("pipeline_runs");
        const column = columns.find((c) => c.column_name === "checkpoint");

        expect(column).toBeDefined();
        expect(column?.data_type).toBe("jsonb");
        expect(column?.is_nullable).toBe("YES");
      });

      it("created_at カラムが存在する（TIMESTAMPTZ型）", async () => {
        const columns = await getTableColumns("pipeline_runs");
        const column = columns.find((c) => c.column_name === "created_at");

        expect(column).toBeDefined();
        expect(column?.data_type).toContain("timestamp");
      });
    });

    describe("CHECK制約", () => {
      it("run_type が無効な値の場合、INSERT でエラーになる", async () => {
        const { error } = await supabase.from("pipeline_runs").insert({
          run_type: "invalid_type",
        });

        expect(error).not.toBeNull();
        expect(error?.code).toBe("23514"); // check_violation
      });

      it("status が無効な値の場合、INSERT でエラーになる", async () => {
        const { error } = await supabase.from("pipeline_runs").insert({
          run_type: "full_crawl",
          status: "invalid_status",
        });

        expect(error).not.toBeNull();
        expect(error?.code).toBe("23514"); // check_violation
      });

      it("有効な run_type 値で INSERT できる", async () => {
        const validRunTypes = ["full_crawl", "diff_crawl", "embedding", "tagging", "full_pipeline"];

        for (const runType of validRunTypes) {
          const insertResult = await supabase
            .from("pipeline_runs")
            .insert({ run_type: runType })
            .select()
            .single();

          expect(insertResult.error).toBeNull();
          const result = insertResult.data as PipelineRun;
          expect(result.run_type).toBe(runType);
          testPipelineRunIds.push(result.id);
        }
      });

      it("有効な status 値で INSERT できる", async () => {
        const validStatuses = ["running", "completed", "failed", "cancelled"];

        for (const status of validStatuses) {
          const insertResult = await supabase
            .from("pipeline_runs")
            .insert({ run_type: "full_crawl", status })
            .select()
            .single();

          expect(insertResult.error).toBeNull();
          const result = insertResult.data as PipelineRun;
          expect(result.status).toBe(status);
          testPipelineRunIds.push(result.id);
        }
      });
    });

    describe("デフォルト値", () => {
      it("status のデフォルト値が 'running' である", async () => {
        const insertResult = await supabase
          .from("pipeline_runs")
          .insert({ run_type: "full_crawl" })
          .select()
          .single();

        expect(insertResult.error).toBeNull();
        const result = insertResult.data as PipelineRun;
        expect(result.status).toBe("running");
        testPipelineRunIds.push(result.id);
      });

      it("stats のデフォルト値が空のオブジェクト {} である", async () => {
        const insertResult = await supabase
          .from("pipeline_runs")
          .insert({ run_type: "full_crawl" })
          .select()
          .single();

        expect(insertResult.error).toBeNull();
        const result = insertResult.data as PipelineRun;
        expect(result.stats).toEqual({});
        testPipelineRunIds.push(result.id);
      });

      it("started_at が自動で現在時刻に設定される", async () => {
        const beforeInsert = new Date();
        const insertResult = await supabase
          .from("pipeline_runs")
          .insert({ run_type: "full_crawl" })
          .select()
          .single();

        expect(insertResult.error).toBeNull();
        const result = insertResult.data as PipelineRun;
        expect(result.started_at).toBeTruthy();

        const startedAt = new Date(result.started_at);
        expect(startedAt.getTime()).toBeGreaterThanOrEqual(beforeInsert.getTime() - 1000);
        testPipelineRunIds.push(result.id);
      });

      it("created_at が自動で現在時刻に設定される", async () => {
        const beforeInsert = new Date();
        const insertResult = await supabase
          .from("pipeline_runs")
          .insert({ run_type: "full_crawl" })
          .select()
          .single();

        expect(insertResult.error).toBeNull();
        const result = insertResult.data as PipelineRun;
        expect(result.created_at).toBeTruthy();

        const createdAt = new Date(result.created_at);
        expect(createdAt.getTime()).toBeGreaterThanOrEqual(beforeInsert.getTime() - 1000);
        testPipelineRunIds.push(result.id);
      });
    });

    describe("JSONB処理", () => {
      it("stats に複雑な JSON オブジェクトを格納できる", async () => {
        const stats = {
          totalArticles: 7000,
          processed: 6950,
          succeeded: 6900,
          failed: 50,
          skipped: 0,
          totalTokens: 5600000,
          estimatedCost: 10.5,
          duration: 3600,
        };

        const insertResult = await supabase
          .from("pipeline_runs")
          .insert({ run_type: "full_pipeline", stats })
          .select()
          .single();

        expect(insertResult.error).toBeNull();
        const result = insertResult.data as PipelineRun;
        expect(result.stats).toEqual(stats);
        testPipelineRunIds.push(result.id);
      });

      it("checkpoint に複雑な JSON オブジェクトを格納できる", async () => {
        const checkpoint = {
          phase: "embedding",
          lastProcessedId: "SCP-3000",
          processedCount: 3500,
          timestamp: "2025-01-11T12:00:00Z",
        };

        const insertResult = await supabase
          .from("pipeline_runs")
          .insert({
            run_type: "diff_crawl",
            checkpoint,
          })
          .select()
          .single();

        expect(insertResult.error).toBeNull();
        const result = insertResult.data as PipelineRun;
        expect(result.checkpoint).toEqual(checkpoint);
        testPipelineRunIds.push(result.id);
      });
    });

    describe("インデックス", () => {
      it("pipeline_runs(status) にインデックスが作成されている", async () => {
        const indexes = await getTableIndexes("pipeline_runs");
        const statusIndex = indexes.find(
          (idx) => idx.index_name.includes("status") || idx.index_definition.includes("(status)")
        );

        expect(statusIndex).toBeDefined();
      });

      it("pipeline_runs(started_at) にインデックスが作成されている", async () => {
        const indexes = await getTableIndexes("pipeline_runs");
        const startedAtIndex = indexes.find(
          (idx) =>
            idx.index_name.includes("started_at") || idx.index_definition.includes("started_at")
        );

        expect(startedAtIndex).toBeDefined();
      });
    });
  });

  // ===========================================
  // AC2: retry_queue テーブル作成
  // ===========================================
  describe("AC2: retry_queue テーブル作成", () => {
    describe("テーブル構造", () => {
      it("テーブルが存在する", async () => {
        const { error } = await supabase.from("retry_queue").select("*").limit(0);

        expect(error).toBeNull();
      });

      it("id カラムが存在する（INTEGER型, PRIMARY KEY）", async () => {
        const columns = await getTableColumns("retry_queue");
        const column = columns.find((c) => c.column_name === "id");

        expect(column).toBeDefined();
        expect(column?.data_type).toBe("integer");
      });

      it("article_id カラムが存在する（TEXT型, NOT NULL）", async () => {
        const columns = await getTableColumns("retry_queue");
        const column = columns.find((c) => c.column_name === "article_id");

        expect(column).toBeDefined();
        expect(column?.data_type).toBe("text");
        expect(column?.is_nullable).toBe("NO");
      });

      it("task_type カラムが存在する（TEXT型, NOT NULL）", async () => {
        const columns = await getTableColumns("retry_queue");
        const column = columns.find((c) => c.column_name === "task_type");

        expect(column).toBeDefined();
        expect(column?.data_type).toBe("text");
        expect(column?.is_nullable).toBe("NO");
      });

      it("retry_count カラムが存在する（INTEGER型, DEFAULT 0）", async () => {
        const columns = await getTableColumns("retry_queue");
        const column = columns.find((c) => c.column_name === "retry_count");

        expect(column).toBeDefined();
        expect(column?.data_type).toBe("integer");
        expect(column?.column_default).toContain("0");
      });

      it("max_retries カラムが存在する（INTEGER型, DEFAULT 3）", async () => {
        const columns = await getTableColumns("retry_queue");
        const column = columns.find((c) => c.column_name === "max_retries");

        expect(column).toBeDefined();
        expect(column?.data_type).toBe("integer");
        expect(column?.column_default).toContain("3");
      });

      it("last_error カラムが存在する（TEXT型, NULLABLE）", async () => {
        const columns = await getTableColumns("retry_queue");
        const column = columns.find((c) => c.column_name === "last_error");

        expect(column).toBeDefined();
        expect(column?.data_type).toBe("text");
        expect(column?.is_nullable).toBe("YES");
      });

      it("next_retry_at カラムが存在する（TIMESTAMPTZ型, NULLABLE）", async () => {
        const columns = await getTableColumns("retry_queue");
        const column = columns.find((c) => c.column_name === "next_retry_at");

        expect(column).toBeDefined();
        expect(column?.data_type).toContain("timestamp");
        expect(column?.is_nullable).toBe("YES");
      });

      it("created_at カラムが存在する（TIMESTAMPTZ型）", async () => {
        const columns = await getTableColumns("retry_queue");
        const column = columns.find((c) => c.column_name === "created_at");

        expect(column).toBeDefined();
        expect(column?.data_type).toContain("timestamp");
      });
    });

    describe("CHECK制約", () => {
      it("task_type が無効な値の場合、INSERT でエラーになる", async () => {
        if (!testArticleId) {
          console.log("テスト用記事がないためスキップ");
          return;
        }

        const { error } = await supabase.from("retry_queue").insert({
          article_id: testArticleId,
          task_type: "invalid_task",
        });

        expect(error).not.toBeNull();
        expect(error?.code).toBe("23514"); // check_violation
      });

      it("有効な task_type 値（embedding）で INSERT できる", async () => {
        if (!testArticleId) {
          console.log("テスト用記事がないためスキップ");
          return;
        }

        const insertResult = await supabase
          .from("retry_queue")
          .insert({ article_id: testArticleId, task_type: "embedding" })
          .select()
          .single();

        expect(insertResult.error).toBeNull();
        const result = insertResult.data as RetryQueue;
        expect(result.task_type).toBe("embedding");
        testRetryQueueIds.push(result.id);
      });

      it("有効な task_type 値（tagging）で INSERT できる", async () => {
        if (!testArticleId) {
          console.log("テスト用記事がないためスキップ");
          return;
        }

        // 先にembeddingを削除してからtaggingをテスト
        await supabase
          .from("retry_queue")
          .delete()
          .eq("article_id", testArticleId)
          .eq("task_type", "tagging");

        const insertResult = await supabase
          .from("retry_queue")
          .insert({ article_id: testArticleId, task_type: "tagging" })
          .select()
          .single();

        expect(insertResult.error).toBeNull();
        const result = insertResult.data as RetryQueue;
        expect(result.task_type).toBe("tagging");
        testRetryQueueIds.push(result.id);
      });
    });

    describe("UNIQUE制約", () => {
      it("(article_id, task_type) の重複で INSERT するとエラーになる", async () => {
        if (!testArticleId) {
          console.log("テスト用記事がないためスキップ");
          return;
        }

        // 最初のレコードを挿入
        await supabase
          .from("retry_queue")
          .delete()
          .eq("article_id", testArticleId)
          .eq("task_type", "embedding");

        const insertResult = await supabase
          .from("retry_queue")
          .insert({ article_id: testArticleId, task_type: "embedding" })
          .select()
          .single();

        expect(insertResult.error).toBeNull();
        const firstRecord = insertResult.data as RetryQueue;
        testRetryQueueIds.push(firstRecord.id);

        // 同じ (article_id, task_type) で再度挿入
        const duplicateResult = await supabase
          .from("retry_queue")
          .insert({ article_id: testArticleId, task_type: "embedding" });

        expect(duplicateResult.error).not.toBeNull();
        expect(duplicateResult.error?.code).toBe("23505"); // unique_violation
      });
    });

    describe("外部キー制約", () => {
      it("存在しない article_id を参照するとエラーになる", async () => {
        const { error } = await supabase.from("retry_queue").insert({
          article_id: "nonexistent-article-id-12345",
          task_type: "embedding",
        });

        expect(error).not.toBeNull();
        expect(error?.code).toBe("23503"); // foreign_key_violation
      });

      it("scp_articles に存在する article_id で INSERT できる", async () => {
        if (!testArticleId) {
          console.log("テスト用記事がないためスキップ");
          return;
        }

        // 既存のレコードを削除
        await supabase
          .from("retry_queue")
          .delete()
          .eq("article_id", testArticleId)
          .eq("task_type", "tagging");

        const insertResult = await supabase
          .from("retry_queue")
          .insert({ article_id: testArticleId, task_type: "tagging" })
          .select()
          .single();

        expect(insertResult.error).toBeNull();
        const result = insertResult.data as RetryQueue;
        expect(result.article_id).toBe(testArticleId);
        testRetryQueueIds.push(result.id);
      });
    });

    describe("デフォルト値", () => {
      it("retry_count のデフォルト値が 0 である", async () => {
        if (!testArticleId) {
          console.log("テスト用記事がないためスキップ");
          return;
        }

        // 既存のレコードを削除
        await supabase
          .from("retry_queue")
          .delete()
          .eq("article_id", testArticleId)
          .eq("task_type", "embedding");

        const insertResult = await supabase
          .from("retry_queue")
          .insert({ article_id: testArticleId, task_type: "embedding" })
          .select()
          .single();

        expect(insertResult.error).toBeNull();
        const result = insertResult.data as RetryQueue;
        expect(result.retry_count).toBe(0);
        testRetryQueueIds.push(result.id);
      });

      it("max_retries のデフォルト値が 3 である", async () => {
        if (!testArticleId) {
          console.log("テスト用記事がないためスキップ");
          return;
        }

        // 先にレコードを削除
        await supabase
          .from("retry_queue")
          .delete()
          .eq("article_id", testArticleId)
          .eq("task_type", "tagging");

        const insertResult = await supabase
          .from("retry_queue")
          .insert({ article_id: testArticleId, task_type: "tagging" })
          .select()
          .single();

        expect(insertResult.error).toBeNull();
        const result = insertResult.data as RetryQueue;
        expect(result.max_retries).toBe(3);
        testRetryQueueIds.push(result.id);
      });

      it("created_at が自動で現在時刻に設定される", async () => {
        if (!testArticleId) {
          console.log("テスト用記事がないためスキップ");
          return;
        }

        // 先にレコードを削除
        await supabase
          .from("retry_queue")
          .delete()
          .eq("article_id", testArticleId)
          .eq("task_type", "embedding");

        const beforeInsert = new Date();
        const insertResult = await supabase
          .from("retry_queue")
          .insert({ article_id: testArticleId, task_type: "embedding" })
          .select()
          .single();

        expect(insertResult.error).toBeNull();
        const result = insertResult.data as RetryQueue;
        expect(result.created_at).toBeTruthy();

        const createdAt = new Date(result.created_at);
        expect(createdAt.getTime()).toBeGreaterThanOrEqual(beforeInsert.getTime() - 1000);
        testRetryQueueIds.push(result.id);
      });
    });

    describe("インデックス", () => {
      it("retry_queue(next_retry_at) にインデックスが作成されている", async () => {
        const indexes = await getTableIndexes("retry_queue");
        const retryIndex = indexes.find(
          (idx) =>
            idx.index_name.includes("next_retry") || idx.index_definition.includes("next_retry_at")
        );

        expect(retryIndex).toBeDefined();
      });

      it("retry_queue(task_type) にインデックスが作成されている", async () => {
        const indexes = await getTableIndexes("retry_queue");
        const taskTypeIndex = indexes.find(
          (idx) =>
            idx.index_name.includes("task_type") || idx.index_definition.includes("task_type")
        );

        expect(taskTypeIndex).toBeDefined();
      });
    });
  });
});
