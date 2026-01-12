#!/usr/bin/env tsx
/**
 * Script 02: Generate Embeddings
 * Usage: pnpm --filter poc run:02-embed [--dry-run] [--id SCP-XXX]
 */

import "../src/lib/env";
import { getSupabaseAdmin } from "../src/lib/supabase";
import {
  generateEmbeddingsForArticles,
  type ScpArticle,
  type EmbeddingResult,
  type EmbeddingStats,
} from "../src/embedding/generate";

interface Args {
  dryRun: boolean;
  articleId: string | null;
}

function parseArgs(): Args {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes("--dry-run"),
    articleId: args.includes("--id") ? (args[args.indexOf("--id") + 1] ?? null) : null,
  };
}

async function fetchArticles(articleId: string | null): Promise<ScpArticle[]> {
  const supabase = getSupabaseAdmin();

  let query = supabase.from("scp_articles").select("id, content");

  if (articleId) {
    query = query.eq("id", articleId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`記事の取得に失敗: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error(articleId ? `記事が見つかりません: ${articleId}` : "記事が見つかりません");
  }

  return data as ScpArticle[];
}

async function saveEmbeddings(results: EmbeddingResult[]): Promise<void> {
  const supabase = getSupabaseAdmin();

  // ドライランの空のembeddingを除外
  const validResults = results.filter((r) => r.embedding.length > 0);

  if (validResults.length === 0) {
    return;
  }

  // Embeddingを保存
  const records = validResults.map((r) => ({
    id: r.articleId,
    embedding: JSON.stringify(r.embedding),
  }));

  const { error } = await supabase.from("scp_embeddings").upsert(records, {
    onConflict: "id",
  });

  if (error) {
    throw new Error(`Embeddingの保存に失敗: ${error.message}`);
  }
}

function printStats(stats: EmbeddingStats, dryRun: boolean): void {
  console.log("\n--- 結果 ---");
  console.log(`対象記事数: ${stats.totalArticles}`);
  console.log(`成功: ${stats.successCount}`);
  console.log(`エラー: ${stats.errorCount}`);
  console.log(`総トークン数: ${stats.totalTokens.toLocaleString()}${dryRun ? " (推定)" : ""}`);
  console.log(`推定コスト: $${stats.estimatedCost.toFixed(6)}`);

  if (stats.errors.length > 0) {
    console.log("\n--- エラー詳細 ---");
    stats.errors.forEach((e) => {
      console.log(`  ${e.articleId}: ${e.error}`);
    });
  }
}

async function main(): Promise<void> {
  const { dryRun, articleId } = parseArgs();

  console.log(`\n🧠 Embedding生成中${dryRun ? " (ドライラン)" : ""}...`);
  if (articleId) {
    console.log(`対象記事: ${articleId}`);
  }
  console.log("");

  // Supabaseから記事を取得
  console.log("Supabaseから記事を取得中...");
  const articles = await fetchArticles(articleId);
  console.log(`${articles.length}件の記事を取得しました`);

  // Embedding生成
  const { results, stats } = await generateEmbeddingsForArticles(articles, {
    dryRun,
    onProgress: (current, total) => {
      process.stdout.write(`\r処理中: ${current}/${total}`);
    },
  });
  console.log(""); // 改行

  // Supabaseに保存 (ドライランはスキップ)
  if (!dryRun && results.length > 0) {
    console.log("\nSupabaseにEmbeddingを保存中...");
    await saveEmbeddings(results);
    console.log(`${results.length}件のEmbeddingを保存しました`);
  }

  // 統計を表示
  printStats(stats, dryRun);

  console.log("\n🎉 完了");
}

main().catch((error) => {
  console.error("\n❌ エラー:", error.message);
  process.exit(1);
});
