/**
 * 014-01-03: 既存データバックフィルスクリプト
 *
 * SCP Data APIから既存記事のauthor情報を補完する。
 *
 * 使用方法:
 *   pnpm tsx scripts/backfill-author.ts [options]
 *
 * オプション:
 *   --dry-run      DBに書き込まず対象件数のみ表示
 *   --batch-size   バッチサイズ（デフォルト: 10）
 */

/** SCP Data API のインデックスアイテム型 */
export interface ScpIndexItem {
  link: string;
  title: string;
  rating: number;
  content_file: string;
  scp: string;
  tags: string[];
  created_at: string;
  creator: string;
}

export type ScpIndex = Record<string, ScpIndexItem>;

/** DB操作のインターフェース（テスト用にDI可能） */
export interface BackfillDb {
  fetchNullAuthorArticles(): Promise<{ article_id: string }[]>;
  updateAuthors(updates: { article_id: string; author: string | null }[]): Promise<void>;
}

/** バックフィル実行オプション */
export interface RunBackfillOptions {
  db: BackfillDb;
  fetchIndex: () => Promise<ScpIndex>;
  dryRun?: boolean;
  batchSize?: number;
}

/** バックフィル実行結果 */
export interface BackfillResult {
  updatedCount: number;
  skippedCount: number;
  skippedIds: string[];
  wouldUpdateCount?: number;
}

/**
 * インデックスから author マップを構築する純粋関数
 *
 * article_id とインデックスを突合し、creator → author のマッピングを返す。
 * - インデックスに存在しない article_id はスキップ
 * - creator が空文字列/空白のみの場合は null
 */
export function buildAuthorMap(
  articles: { article_id: string }[],
  index: ScpIndex
): Map<string, string | null> {
  // インデックスを scp フィールドの小文字で引けるマップに変換
  const indexByScp = new Map<string, ScpIndexItem>();
  for (const item of Object.values(index)) {
    indexByScp.set(item.scp.toLowerCase(), item);
  }

  const authorMap = new Map<string, string | null>();

  for (const article of articles) {
    const indexItem = indexByScp.get(article.article_id.toLowerCase());
    if (!indexItem) {
      continue;
    }

    const creator = indexItem.creator.trim();
    authorMap.set(article.article_id, creator ? creator : null);
  }

  return authorMap;
}

/**
 * バックフィルを実行する
 */
export async function runBackfill(options: RunBackfillOptions): Promise<BackfillResult> {
  const { db, fetchIndex, dryRun = false, batchSize = 10 } = options;

  // 1. author が NULL のレコードを取得
  const nullArticles = await db.fetchNullAuthorArticles();

  if (nullArticles.length === 0) {
    console.log("author が NULL のレコードはありません。");
    return { updatedCount: 0, skippedCount: 0, skippedIds: [] };
  }

  console.log(`対象レコード数: ${String(nullArticles.length)}`);

  // 2. SCP Data API からインデックスを取得
  const index = await fetchIndex();

  // 3. author マップを構築
  const authorMap = buildAuthorMap(nullArticles, index);

  // スキップされた記事を算出
  const skippedIds = nullArticles
    .filter((a) => !authorMap.has(a.article_id))
    .map((a) => a.article_id);

  if (skippedIds.length > 0) {
    console.log(`スキップ: ${String(skippedIds.length)}件（インデックスに未存在）`);
    for (const id of skippedIds) {
      console.log(`  - ${id}`);
    }
  }

  // ドライランの場合
  if (dryRun) {
    console.log(`[ドライラン] 更新対象: ${String(authorMap.size)}件`);
    return {
      updatedCount: 0,
      skippedCount: skippedIds.length,
      skippedIds,
      wouldUpdateCount: authorMap.size,
    };
  }

  // 4. バッチ更新
  const updates = [...authorMap.entries()].map(([article_id, author]) => ({
    article_id,
    author,
  }));

  let processedCount = 0;
  for (let i = 0; i < updates.length; i += batchSize) {
    const batch = updates.slice(i, i + batchSize);
    await db.updateAuthors(batch);
    processedCount += batch.length;
    console.log(`更新進捗: ${String(processedCount)}/${String(updates.length)}`);
  }

  // 5. 結果サマリー
  console.log(`\n完了: 更新=${String(updates.length)}件, スキップ=${String(skippedIds.length)}件`);

  return {
    updatedCount: updates.length,
    skippedCount: skippedIds.length,
    skippedIds,
  };
}

// ============================================
// CLI エントリポイント（直接実行時のみ）
// ============================================
const isDirectExecution =
  typeof process !== "undefined" && process.argv[1]?.includes("backfill-author");

if (isDirectExecution) {
  const { parseArgs } = await import("node:util");
  const { createClient } = await import("@supabase/supabase-js");

  const { values } = parseArgs({
    options: {
      "dry-run": { type: "boolean", default: false },
      "batch-size": { type: "string", default: "10" },
    },
  });

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("環境変数 SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY が必要です。");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const db: BackfillDb = {
    async fetchNullAuthorArticles() {
      const { data, error } = await supabase
        .from("scp_articles")
        .select("article_id")
        .is("author", null);
      if (error) throw new Error(`DB取得エラー: ${error.message}`);
      return data;
    },
    async updateAuthors(updates) {
      const results = await Promise.all(
        updates.map(({ article_id, author }) =>
          supabase
            .from("scp_articles")
            .update({ author })
            .eq("article_id", article_id)
            .then((r) => ({
              article_id,
              error: r.error,
            }))
        )
      );
      const failed = results.find((r) => r.error);
      if (failed?.error) {
        throw new Error(`DB更新エラー (${failed.article_id}): ${failed.error.message}`);
      }
    },
  };

  const fetchIndex = async (): Promise<ScpIndex> => {
    const response = await fetch("https://scp-data.tedivm.com/data/scp/items/index.json");
    if (!response.ok) {
      throw new Error(`API取得エラー: ${String(response.status)}`);
    }
    return (await response.json()) as ScpIndex;
  };

  const result = await runBackfill({
    db,
    fetchIndex,
    dryRun: values["dry-run"],
    batchSize: Number(values["batch-size"]) || 10,
  });

  console.log("\n結果:", JSON.stringify(result, null, 2));
}
