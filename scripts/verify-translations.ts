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
 * URLの存在確認（HEAD → GETフォールバック）
 *
 * 戻り値:
 * - true:  翻訳あり（200 OK確認済み）
 * - false: 翻訳なし（404確認済み）
 * - null:  判定不能（ネットワークエラー、タイムアウト等）→ NULLのまま保留
 */
async function checkUrl(url: string): Promise<boolean | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), HEAD_TIMEOUT_MS);

  try {
    // 1. HEADリクエストで軽量チェック
    const headResponse = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
    });

    // 200-299: 翻訳あり
    if (headResponse.ok) {
      return true;
    }

    // 404: 翻訳なし（確定）
    if (headResponse.status === 404) {
      return false;
    }

    // 403/405/500等: HEADが拒否された可能性 → GETでフォールバック
    clearTimeout(timeoutId);
    const getController = new AbortController();
    const getTimeoutId = setTimeout(() => getController.abort(), HEAD_TIMEOUT_MS);

    try {
      const getResponse = await fetch(url, {
        method: "GET",
        signal: getController.signal,
        redirect: "follow",
      });

      if (getResponse.ok) {
        return true;
      }

      if (getResponse.status === 404) {
        return false;
      }

      // GETでも判定不能 → 保留
      return null;
    } catch {
      // GETフォールバックもネットワークエラー → 保留
      return null;
    } finally {
      clearTimeout(getTimeoutId);
    }
  } catch {
    // ネットワークエラー・タイムアウト → 保留（FALSEにしない）
    return null;
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
  let totalSkippedCount = 0;
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

    // 2. URL一括チェック（3値: true/false/null）
    let existsCount = 0;
    let notFoundCount = 0;
    let skippedCount = 0;

    const results = await processInBatches(rows, concurrency, async (row) => {
      const exists = await checkUrl(row.url);
      if (exists === true) {
        existsCount++;
      } else if (exists === false) {
        notFoundCount++;
      } else {
        skippedCount++;
      }
      return { ...row, exists };
    });

    totalExistsCount += existsCount;
    totalNotFoundCount += notFoundCount;
    totalSkippedCount += skippedCount;

    console.log(
      `  翻訳あり: ${existsCount} 件 / 翻訳なし: ${notFoundCount} 件 / 判定保留: ${skippedCount} 件`
    );

    if (dryRun) {
      const notFoundItems = results.filter((r) => r.exists === false);
      if (notFoundItems.length > 0) {
        console.log(`  翻訳なし記事（先頭10件）:`);
        notFoundItems.slice(0, 10).forEach((r) => {
          console.log(`    ${r.article_id}: ${r.url}`);
        });
        if (notFoundItems.length > 10) {
          console.log(`    ... 他 ${notFoundItems.length - 10} 件`);
        }
      }
      const skippedItems = results.filter((r) => r.exists === null);
      if (skippedItems.length > 0) {
        console.log(`  判定保留記事（先頭10件）:`);
        skippedItems.slice(0, 10).forEach((r) => {
          console.log(`    ${r.article_id}: ${r.url}`);
        });
        if (skippedItems.length > 10) {
          console.log(`    ... 他 ${skippedItems.length - 10} 件`);
        }
      }
    } else {
      // 3. DB更新（ページごとに即時更新。判定保留=nullはNULLのまま残す）
      const existsIds = results.filter((r) => r.exists === true).map((r) => r.article_id);
      const notFoundIds = results.filter((r) => r.exists === false).map((r) => r.article_id);

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

    // 判定済み件数（TRUE/FALSEに更新された件数）で残件を減算
    // 判定保留（null）はNULLのまま残るため、remaining からは引かない
    const resolvedCount = existsCount + notFoundCount;
    remaining -= resolvedCount;

    // 全件が判定保留だった場合、同じレコードが再取得されるため無限ループを防止
    if (resolvedCount === 0) {
      console.log("  ⚠ このページは全件判定保留のためスキップします");
      break;
    }

    // 取得件数がページサイズ未満なら最終ページ
    if (rows.length < fetchSize) {
      break;
    }
  }

  console.log("");
  console.log(`=== 最終結果 ===`);
  console.log(`翻訳あり (200 OK):      ${totalExistsCount} 件`);
  console.log(`翻訳なし (404):         ${totalNotFoundCount} 件`);
  console.log(`判定保留 (エラー等):    ${totalSkippedCount} 件`);
  console.log(
    `合計:                   ${totalExistsCount + totalNotFoundCount + totalSkippedCount} 件`
  );
  if (totalSkippedCount > 0) {
    console.log(
      `\n※ 判定保留の ${totalSkippedCount} 件はNULLのまま残っています。再実行で再チェックされます。`
    );
  }
  if (dryRun) {
    console.log("[DRY RUN] DB更新はスキップされました");
  }
  console.log("\n完了");
}

main().catch((e) => {
  console.error("予期しないエラー:", e);
  process.exit(1);
});
