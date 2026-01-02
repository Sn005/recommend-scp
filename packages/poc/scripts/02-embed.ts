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
    articleId: args.includes("--id")
      ? args[args.indexOf("--id") + 1] ?? null
      : null,
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
    throw new Error(`Failed to fetch articles: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error(
      articleId ? `Article not found: ${articleId}` : "No articles found"
    );
  }

  return data as ScpArticle[];
}

async function saveEmbeddings(results: EmbeddingResult[]): Promise<void> {
  const supabase = getSupabaseAdmin();

  // Filter out results with empty embeddings (from dry run)
  const validResults = results.filter((r) => r.embedding.length > 0);

  if (validResults.length === 0) {
    return;
  }

  // Upsert embeddings
  const records = validResults.map((r) => ({
    id: r.articleId,
    embedding: JSON.stringify(r.embedding),
  }));

  const { error } = await supabase.from("scp_embeddings").upsert(records, {
    onConflict: "id",
  });

  if (error) {
    throw new Error(`Failed to save embeddings: ${error.message}`);
  }
}

function printStats(stats: EmbeddingStats, dryRun: boolean): void {
  console.log("\n--- Results ---");
  console.log(`Total articles: ${stats.totalArticles}`);
  console.log(`Success: ${stats.successCount}`);
  console.log(`Errors: ${stats.errorCount}`);
  console.log(
    `Total tokens: ${stats.totalTokens.toLocaleString()}${dryRun ? " (estimated)" : ""}`
  );
  console.log(`Estimated cost: $${stats.estimatedCost.toFixed(6)}`);

  if (stats.errors.length > 0) {
    console.log("\n--- Errors ---");
    stats.errors.forEach((e) => {
      console.log(`  ${e.articleId}: ${e.error}`);
    });
  }
}

async function main(): Promise<void> {
  const { dryRun, articleId } = parseArgs();

  console.log(`\nGenerating embeddings${dryRun ? " (dry run)" : ""}...`);
  if (articleId) {
    console.log(`Target article: ${articleId}`);
  }
  console.log("");

  // Fetch articles from Supabase
  console.log("Fetching articles from Supabase...");
  const articles = await fetchArticles(articleId);
  console.log(`Found ${articles.length} article(s)`);

  // Generate embeddings
  const { results, stats } = await generateEmbeddingsForArticles(articles, {
    dryRun,
    onProgress: (current, total) => {
      process.stdout.write(`\rProcessing: ${current}/${total}`);
    },
  });
  console.log(""); // New line after progress

  // Save to Supabase (skip for dry run)
  if (!dryRun && results.length > 0) {
    console.log("\nSaving embeddings to Supabase...");
    await saveEmbeddings(results);
    console.log(`Saved ${results.length} embedding(s)`);
  }

  // Print stats
  printStats(stats, dryRun);

  console.log("\nDone!");
}

main().catch((error) => {
  console.error("\nError:", error.message);
  process.exit(1);
});
