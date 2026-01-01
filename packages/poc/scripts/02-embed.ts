#!/usr/bin/env tsx
/**
 * Script 02: Generate Embeddings
 * Usage:
 *   pnpm --filter poc run:02-embed              # 全記事のEmbedding生成
 *   pnpm --filter poc run:02-embed -- --dry-run # ドライラン（API呼び出しなし）
 *   pnpm --filter poc run:02-embed -- --id SCP-173  # 特定の記事のみ
 */

import "../src/lib/env";
import { getSupabaseAdmin } from "../src/lib/supabase";
import {
  generateEmbeddingsBatch,
  printStats,
  printErrors,
  preprocessContent,
  calculateCost,
  type EmbeddingResult,
} from "../src/embedding/generate";

interface CliOptions {
  dryRun: boolean;
  articleId: string | null;
}

const parseArgs = (args: string[]): CliOptions => {
  const options: CliOptions = {
    dryRun: false,
    articleId: null,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--dry-run") {
      options.dryRun = true;
    } else if (arg === "--id" && args[i + 1]) {
      options.articleId = args[i + 1];
      i++;
    }
  }

  return options;
};

/**
 * scp_articlesから記事を取得
 */
const fetchArticles = async (
  articleId: string | null
): Promise<Array<{ id: string; content: string }>> => {
  const supabase = getSupabaseAdmin();

  let query = supabase.from("scp_articles").select("id, content");

  if (articleId) {
    query = query.eq("id", articleId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch articles: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error("No articles found in database");
  }

  return data.filter((article) => article.content && article.content.length > 0);
};

/**
 * Embeddingをscp_embeddingsテーブルにupsert
 */
const saveEmbeddings = async (results: EmbeddingResult[]): Promise<void> => {
  const supabase = getSupabaseAdmin();

  const records = results.map((result) => ({
    id: result.articleId,
    embedding: result.embedding,
  }));

  // upsertでバッチ保存
  const { error } = await supabase.from("scp_embeddings").upsert(records, {
    onConflict: "id",
  });

  if (error) {
    throw new Error(`Failed to save embeddings: ${error.message}`);
  }
};

/**
 * ドライラン: トークン数のみ推定
 */
const runDryRun = async (
  articles: Array<{ id: string; content: string }>
): Promise<void> => {
  console.log("\n🔍 Dry run mode - estimating tokens without API calls\n");

  // 簡易的なトークン推定（4文字 ≈ 1トークン）
  const estimateTokens = (text: string): number => Math.ceil(text.length / 4);

  let totalTokens = 0;
  const estimates: Array<{ id: string; tokens: number; chars: number }> = [];

  for (const article of articles) {
    const processed = preprocessContent(article.content);
    const tokens = estimateTokens(processed);
    totalTokens += tokens;
    estimates.push({
      id: article.id,
      tokens,
      chars: processed.length,
    });
  }

  console.log("📋 Token estimates per article:");
  estimates.forEach(({ id, tokens, chars }) => {
    console.log(`  ${id}: ~${tokens.toLocaleString()} tokens (${chars.toLocaleString()} chars)`);
  });

  console.log("\n📊 Summary:");
  console.log(`  Total articles: ${articles.length}`);
  console.log(`  Estimated total tokens: ~${totalTokens.toLocaleString()}`);
  console.log(`  Estimated cost: ~$${calculateCost(totalTokens).toFixed(4)}`);
};

async function main() {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  console.log("\n🔮 OpenAI Embedding Generator");
  console.log("================================");

  if (options.dryRun) {
    console.log("Mode: Dry run (no API calls)");
  } else {
    console.log("Mode: Generate & Save");
  }

  if (options.articleId) {
    console.log(`Target: ${options.articleId}`);
  } else {
    console.log("Target: All articles");
  }

  try {
    // 記事を取得
    console.log("\n📚 Fetching articles from database...");
    const articles = await fetchArticles(options.articleId);
    console.log(`Found ${articles.length} articles`);

    if (options.dryRun) {
      // ドライラン
      await runDryRun(articles);
    } else {
      // Embedding生成
      console.log("\n🚀 Generating embeddings...");
      const { results, errors, stats } = await generateEmbeddingsBatch(articles);

      // 統計情報を表示
      printStats(stats);

      // エラー一覧を表示
      printErrors(errors);

      // DBに保存
      if (results.length > 0) {
        console.log("\n💾 Saving embeddings to database...");
        await saveEmbeddings(results);
        console.log(`Saved ${results.length} embeddings`);
      }
    }

    console.log("\n✅ Embedding generation complete");
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

main();
