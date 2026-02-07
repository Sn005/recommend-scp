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

const SUPABASE_PAGE_SIZE = 1000;

async function main() {
  console.log("=== 翻訳URL一括検証スクリプト ===");
  console.log(`モード: ${dryRun ? "DRY RUN（DB更新なし）" : "実行"}`);
  console.log(`並列数: ${concurrency}`);
  if (limit) console.log(`検証件数上限: ${limit}`);
  console.log("");

  let totalExistsCount = 0;
  let totalNotFoundCount = 0;
  let pageNumber = 0;
  let remaining = limit ?? Infinity;

  // Supabaseのデフォルト1000件制限を回避するためループで全件処理
  while (remaining > 0) {
    pageNumber++;
    const fetchSize = Math.min(SUPABASE_PAGE_SIZE, remaining);

    // 1. 未検証レコードを取得（処理済みはNULLでなくなるため、次の1000件が自動的に返る）
    const { data: rows, error } = (await supabase
      .from("article_translations")
      .select("article_id, lang, url, has_translation")
      .eq("lang", "ja")
      .is("has_translation", null)
      .order("article_id")
      .limit(fetchSize)) as {
      data: TranslationRow[] | null;
      error: Error | null;
    };

    if (error) {
      console.error("DB取得エラー:", error);
      process.exit(1);
    }

    if (!rows || rows.length === 0) {
      if (pageNumber === 1) {
        console.log("検証対象のレコードがありません（全件検証済み）");
      }
      break;
    }

    console.log(
      `--- ページ ${pageNumber}: ${rows.length} 件取得（累計: ${totalExistsCount + totalNotFoundCount + rows.length} 件目まで） ---`
    );

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

    totalExistsCount += existsCount;
    totalNotFoundCount += notFoundCount;

    console.log(`  翻訳あり: ${existsCount} 件 / 翻訳なし: ${notFoundCount} 件`);

    if (dryRun) {
      const notFoundItems = results.filter((r) => !r.exists);
      if (notFoundItems.length > 0) {
        console.log(`  翻訳なし記事（先頭10件）:`);
        notFoundItems.slice(0, 10).forEach((r) => {
          console.log(`    ${r.article_id}: ${r.url}`);
        });
        if (notFoundItems.length > 10) {
          console.log(`    ... 他 ${notFoundItems.length - 10} 件`);
        }
      }
    } else {
      // 3. DB更新（ページごとに即時更新）
      const existsIds = results.filter((r) => r.exists).map((r) => r.article_id);
      const notFoundIds = results.filter((r) => !r.exists).map((r) => r.article_id);

      if (existsIds.length > 0) {
        const { error: updateError } = await supabase
          .from("article_translations")
          .update({ has_translation: true, checked_at: new Date().toISOString() })
          .eq("lang", "ja")
          .in("article_id", existsIds);

        if (updateError) {
          console.error("TRUE更新エラー:", updateError);
        }
      }

      if (notFoundIds.length > 0) {
        const { error: updateError } = await supabase
          .from("article_translations")
          .update({ has_translation: false, checked_at: new Date().toISOString() })
          .eq("lang", "ja")
          .in("article_id", notFoundIds);

        if (updateError) {
          console.error("FALSE更新エラー:", updateError);
        }
      }

      console.log(`  DB更新完了`);
    }

    remaining -= rows.length;

    // 取得件数がページサイズ未満なら最終ページ
    if (rows.length < fetchSize) {
      break;
    }
  }

  console.log("");
  console.log(`=== 最終結果 ===`);
  console.log(`翻訳あり (200 OK): ${totalExistsCount} 件`);
  console.log(`翻訳なし (404等):  ${totalNotFoundCount} 件`);
  console.log(`合計:              ${totalExistsCount + totalNotFoundCount} 件`);
  if (dryRun) {
    console.log("[DRY RUN] DB更新はスキップされました");
  }
  console.log("\n完了");
}

main().catch((e) => {
  console.error("予期しないエラー:", e);
  process.exit(1);
});
