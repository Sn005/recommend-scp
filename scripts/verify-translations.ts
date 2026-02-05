/**
 * @file 翻訳URL一括検証スクリプト
 * @description article_translations テーブルのURLをHEADリクエストで一括検証し、
 *              has_translation フラグを更新する。
 *
 * 使用方法:
 *   npx tsx scripts/verify-translations.ts
 *
 * オプション:
 *   --dry-run    DB更新を行わずに結果を表示
 *   --limit N    検証する件数を制限（デフォルト: 全件）
 *   --concurrency N  並列数（デフォルト: 5）
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

// 環境変数読み込み（dotenv/find-up不要: Node.js標準APIのみ使用）
const envPath = resolve(import.meta.dirname ?? __dirname, "..", ".env");
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY が必要です");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// CLI引数パース
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const limitIdx = args.indexOf("--limit");
const limit = limitIdx !== -1 ? parseInt(args[limitIdx + 1], 10) : undefined;
const concurrencyIdx = args.indexOf("--concurrency");
const concurrency = concurrencyIdx !== -1 ? parseInt(args[concurrencyIdx + 1], 10) : 5;

const HEAD_TIMEOUT_MS = 10_000;
const DELAY_BETWEEN_BATCHES_MS = 1_000;

interface TranslationRow {
  article_id: string;
  lang: string;
  url: string;
  has_translation: boolean | null;
}

/**
 * URLの存在確認（HEADリクエスト）
 */
async function checkUrl(url: string): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), HEAD_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
    });
    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * 並列実行ヘルパー
 */
async function processInBatches<T, R>(
  items: T[],
  batchSize: number,
  processor: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);

    const processed = Math.min(i + batchSize, items.length);
    console.log(`  進捗: ${processed}/${items.length} 件完了`);

    // レート制限: バッチ間にディレイ
    if (i + batchSize < items.length) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_BATCHES_MS));
    }
  }
  return results;
}

async function main() {
  console.log("=== 翻訳URL一括検証スクリプト ===");
  console.log(`モード: ${dryRun ? "DRY RUN（DB更新なし）" : "実行"}`);
  console.log(`並列数: ${concurrency}`);
  if (limit) console.log(`検証件数上限: ${limit}`);
  console.log("");

  // 1. 未検証レコードを取得
  let query = supabase
    .from("article_translations")
    .select("article_id, lang, url, has_translation")
    .eq("lang", "ja")
    .is("has_translation", null)
    .order("article_id");

  if (limit) {
    query = query.limit(limit);
  }

  const { data: rows, error } = (await query) as {
    data: TranslationRow[] | null;
    error: Error | null;
  };

  if (error) {
    console.error("DB取得エラー:", error);
    process.exit(1);
  }

  if (!rows || rows.length === 0) {
    console.log("検証対象のレコードがありません（全件検証済み）");
    return;
  }

  console.log(`検証対象: ${rows.length} 件`);
  console.log("");

  // 2. URL一括チェック
  let existsCount = 0;
  let notFoundCount = 0;

  const results = await processInBatches(rows, concurrency, async (row) => {
    const exists = await checkUrl(row.url);
    if (exists) {
      existsCount++;
    } else {
      notFoundCount++;
    }
    return { ...row, exists };
  });

  console.log("");
  console.log(`=== 結果 ===`);
  console.log(`翻訳あり (200 OK): ${existsCount} 件`);
  console.log(`翻訳なし (404等):  ${notFoundCount} 件`);
  console.log("");

  if (dryRun) {
    console.log("[DRY RUN] DB更新はスキップされました");
    // 翻訳なしの一覧を表示
    const notFoundItems = results.filter((r) => !r.exists);
    if (notFoundItems.length > 0) {
      console.log(`\n翻訳なし記事一覧 (先頭20件):`);
      notFoundItems.slice(0, 20).forEach((r) => {
        console.log(`  ${r.article_id}: ${r.url}`);
      });
      if (notFoundItems.length > 20) {
        console.log(`  ... 他 ${notFoundItems.length - 20} 件`);
      }
    }
    return;
  }

  // 3. DB更新
  console.log("DB更新中...");

  const existsIds = results.filter((r) => r.exists).map((r) => r.article_id);
  const notFoundIds = results.filter((r) => !r.exists).map((r) => r.article_id);

  if (existsIds.length > 0) {
    // バッチ更新: has_translation = TRUE
    const { error: updateError } = await supabase
      .from("article_translations")
      .update({ has_translation: true, checked_at: new Date().toISOString() })
      .eq("lang", "ja")
      .in("article_id", existsIds);

    if (updateError) {
      console.error("TRUE更新エラー:", updateError);
    } else {
      console.log(`  has_translation = TRUE: ${existsIds.length} 件更新`);
    }
  }

  if (notFoundIds.length > 0) {
    // バッチ更新: has_translation = FALSE
    const { error: updateError } = await supabase
      .from("article_translations")
      .update({ has_translation: false, checked_at: new Date().toISOString() })
      .eq("lang", "ja")
      .in("article_id", notFoundIds);

    if (updateError) {
      console.error("FALSE更新エラー:", updateError);
    } else {
      console.log(`  has_translation = FALSE: ${notFoundIds.length} 件更新`);
    }
  }

  console.log("\n完了");
}

main().catch((e) => {
  console.error("予期しないエラー:", e);
  process.exit(1);
});
