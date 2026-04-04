/**
 * @file Supabaseスロークエリ確認スクリプト（AC3）
 * @description 018-03-01 Subtask の AC3 を確認する。
 *              Supabase の pg_stat_statements を照会し、
 *              主要クエリの平均実行時間がベースラインの200%以内であることを検証する。
 *
 * 使用方法:
 *   npx tsx scripts/check-slow-queries.ts
 *
 * 必須環境変数:
 *   SUPABASE_URL               本番SupabaseプロジェクトのURL
 *   SUPABASE_SERVICE_ROLE_KEY  Service Roleキー（pg_stat_statementsアクセス権限必須）
 *
 * 代替（手動確認）:
 *   Supabase ダッシュボード > SQL Editor で以下のSQLを実行:
 *
 *   SELECT
 *     LEFT(query, 120) AS query_preview,
 *     calls,
 *     ROUND(mean_exec_time::numeric, 1) AS mean_exec_time_ms,
 *     ROUND(total_exec_time::numeric, 1) AS total_exec_time_ms
 *   FROM pg_stat_statements
 *   WHERE query ILIKE '%search_articles_by_embedding%'
 *      OR query ILIKE '%search_articles_by_unexplored_tags%'
 *   ORDER BY mean_exec_time DESC
 *   LIMIT 10;
 *
 * 判定基準（ベースライン × 200%）:
 *   search_articles_by_embedding    ベースライン 391ms → 閾値 782ms
 *   search_articles_by_unexplored_tags  ベースライン 604ms → 閾値 1208ms
 */

import { config } from "dotenv";
import { findUpSync } from "find-up";
import { dirname, join } from "path";
import { createClient } from "@supabase/supabase-js";

// 環境変数読み込み
const workspaceFile = findUpSync("pnpm-workspace.yaml");
if (workspaceFile) {
  config({ path: join(dirname(workspaceFile), ".env"), override: false });
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * ベースライン: docs/operations/slow-query-optimization.md に記録されたA案適用後の値
 * 200%以内 = ベースライン × 2 が上限閾値
 */
const BASELINES: Array<{ name: string; patternLike: string; baselineMs: number }> = [
  {
    name: "search_articles_by_embedding",
    patternLike: "search_articles_by_embedding",
    baselineMs: 391, // A案適用後の平均実行時間（docs/operations/slow-query-optimization.md 対応記録#1）
  },
  {
    name: "search_articles_by_unexplored_tags",
    patternLike: "search_articles_by_unexplored_tags",
    baselineMs: 604, // A案適用後の平均実行時間（docs/operations/slow-query-optimization.md 対応記録#1）
  },
];

const THRESHOLD_RATIO = 2.0; // 200%以内

interface QueryStats {
  query_preview: string;
  calls: number;
  mean_exec_time_ms: number;
  total_exec_time_ms: number;
}

interface CheckResult {
  name: string;
  baselineMs: number;
  thresholdMs: number;
  measuredMs: number | null;
  calls: number;
  pass: boolean;
  message: string;
}

async function main(): Promise<void> {
  console.log("=== Supabaseスロークエリ確認 (018-03-01 AC3) ===");

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("❌ SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY が必要です");
    console.error("   .env ファイルまたは環境変数に設定してください");
    console.log("\n📋 手動確認用SQL (Supabaseダッシュボード > SQL Editor で実行):");
    printManualCheckSQL();
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const results: CheckResult[] = [];

  for (const baseline of BASELINES) {
    const thresholdMs = baseline.baselineMs * THRESHOLD_RATIO;

    // pg_stat_statements からクエリ統計を取得
    // NOTE: Supabase では pg_stat_statements への直接アクセスに
    //       extensions スキーマの SELECT 権限が必要
    const { data, error } = await supabase.rpc("query_pg_stat_statements", {
      pattern: `%${baseline.patternLike}%`,
    });

    if (error) {
      // RPC関数が存在しない場合は手動確認を促す
      console.warn(`\n⚠️  RPC query_pg_stat_statements が利用できません: ${error.message}`);
      console.log("📋 Supabaseダッシュボード > SQL Editor で以下を実行してください:");
      printManualCheckSQL();
      results.push({
        name: baseline.name,
        baselineMs: baseline.baselineMs,
        thresholdMs,
        measuredMs: null,
        calls: 0,
        pass: false,
        message: `自動取得不可 - 手動確認が必要（閾値: ${thresholdMs}ms）`,
      });
      continue;
    }

    const rows = (data as QueryStats[]) ?? [];
    if (rows.length === 0) {
      results.push({
        name: baseline.name,
        baselineMs: baseline.baselineMs,
        thresholdMs,
        measuredMs: null,
        calls: 0,
        pass: true,
        message: "計測データなし（クエリが実行されていない可能性）",
      });
      continue;
    }

    // 複数エントリの場合は最大の平均実行時間を採用（最悪ケースで判定）
    const maxMeanMs = Math.max(...rows.map((r) => r.mean_exec_time_ms));
    const totalCalls = rows.reduce((sum, r) => sum + r.calls, 0);
    const pass = maxMeanMs <= thresholdMs;

    results.push({
      name: baseline.name,
      baselineMs: baseline.baselineMs,
      thresholdMs,
      measuredMs: maxMeanMs,
      calls: totalCalls,
      pass,
      message: `${maxMeanMs.toFixed(1)}ms (${totalCalls}calls, 閾値: ${thresholdMs}ms)`,
    });
  }

  // 結果表示
  console.log("\n[RESULT] スロークエリ確認結果:");
  for (const r of results) {
    const mark = r.measuredMs === null ? "⚠️  N/A" : r.pass ? "✅ PASS" : "❌ FAIL";
    console.log(`  ${mark}  ${r.name}: ${r.message} (ベースライン: ${r.baselineMs}ms)`);
  }

  const allAutoChecksPass = results.filter((r) => r.measuredMs !== null).every((r) => r.pass);
  const hasManualCheck = results.some((r) => r.measuredMs === null);

  if (hasManualCheck) {
    console.log("\n⚠️  一部のチェックは手動確認が必要です。上記のSQLを実行してください。");
  }
  if (allAutoChecksPass && !hasManualCheck) {
    console.log("\n✅ 全チェック PASS");
  } else if (!allAutoChecksPass) {
    console.log("\n❌ 一部チェック FAIL");
    process.exit(1);
  }
}

function printManualCheckSQL(): void {
  console.log(`
  -- B案適用後の主要クエリ実行時間確認
  SELECT
    LEFT(query, 120) AS query_preview,
    calls,
    ROUND(mean_exec_time::numeric, 1) AS mean_exec_time_ms,
    ROUND(total_exec_time::numeric, 1) AS total_exec_time_ms
  FROM pg_stat_statements
  WHERE query ILIKE '%search_articles_by_embedding%'
     OR query ILIKE '%search_articles_by_unexplored_tags%'
  ORDER BY mean_exec_time DESC
  LIMIT 10;

  -- 判定基準（ベースライン × 200%）:
  --   search_articles_by_embedding:        mean_exec_time_ms <= 782ms
  --   search_articles_by_unexplored_tags:  mean_exec_time_ms <= 1208ms
  `);
}

main().catch((err) => {
  console.error("スクリプトエラー:", err);
  process.exit(1);
});
