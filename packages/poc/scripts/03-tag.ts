#!/usr/bin/env tsx
/**
 * Script 03: Extract Tags
 * Usage: pnpm --filter poc run:03-tag [--dry-run] [--id SCP-XXX]
 */

import "../src/lib/env";
import { writeFileSync } from "fs";
import { join } from "path";
import { getSupabaseAdmin } from "../src/lib/supabase";
import {
  extractTagsForArticles,
  generateTagReport,
  type ScpArticle,
  type TaggingResult,
  type TaggingStats,
} from "../src/tagging/extract";

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

async function saveTags(results: TaggingResult[]): Promise<void> {
  const supabase = getSupabaseAdmin();

  for (const result of results) {
    // Collect all tags for this article
    const allTags = [
      { category: "object_class", value: result.tags.object_class },
      ...result.tags.genre.map((v) => ({ category: "genre", value: v })),
      ...result.tags.theme.map((v) => ({ category: "theme", value: v })),
      { category: "format", value: result.tags.format },
    ];

    // Upsert tags and get their IDs
    const tagIds: number[] = [];
    for (const tag of allTags) {
      // Insert or get existing tag
      const { data: existingTag } = await supabase
        .from("tags")
        .select("id")
        .eq("category", tag.category)
        .eq("value", tag.value)
        .single();

      if (existingTag) {
        tagIds.push(existingTag.id);
      } else {
        const { data: newTag, error: insertError } = await supabase
          .from("tags")
          .insert({ category: tag.category, value: tag.value })
          .select("id")
          .single();

        if (insertError) {
          console.error(
            `Failed to insert tag ${tag.category}:${tag.value}: ${insertError.message}`
          );
          continue;
        }
        if (newTag) {
          tagIds.push(newTag.id);
        }
      }
    }

    // Delete existing article_tags for this article
    await supabase.from("article_tags").delete().eq("article_id", result.articleId);

    // Insert new article_tags
    if (tagIds.length > 0) {
      const articleTags = tagIds.map((tagId) => ({
        article_id: result.articleId,
        tag_id: tagId,
      }));

      const { error: linkError } = await supabase
        .from("article_tags")
        .insert(articleTags);

      if (linkError) {
        console.error(
          `Failed to link tags for ${result.articleId}: ${linkError.message}`
        );
      }
    }
  }
}

function printStats(stats: TaggingStats, dryRun: boolean): void {
  console.log("\n--- Results ---");
  console.log(`Total articles: ${stats.totalArticles}`);
  console.log(`Success: ${stats.successCount}`);
  console.log(`Errors: ${stats.errorCount}`);
  console.log(
    `Total input tokens: ${stats.totalInputTokens.toLocaleString()}${dryRun ? " (estimated)" : ""}`
  );
  console.log(
    `Total output tokens: ${stats.totalOutputTokens.toLocaleString()}${dryRun ? " (estimated)" : ""}`
  );
  console.log(`Estimated cost: $${stats.estimatedCost.toFixed(6)}`);

  if (!dryRun) {
    console.log("\n--- Unique Tags ---");
    console.log(`Object Classes: ${stats.uniqueTags.object_class.join(", ")}`);
    console.log(`Genres: ${stats.uniqueTags.genre.join(", ")}`);
    console.log(`Themes: ${stats.uniqueTags.theme.join(", ")}`);
    console.log(`Formats: ${stats.uniqueTags.format.join(", ")}`);
  }

  if (stats.errors.length > 0) {
    console.log("\n--- Errors ---");
    stats.errors.forEach((e) => {
      console.log(`  ${e.articleId}: ${e.error}`);
    });
  }
}

async function main(): Promise<void> {
  const { dryRun, articleId } = parseArgs();

  console.log(`\n🏷️  Extracting tags${dryRun ? " (dry run)" : ""}...`);
  if (articleId) {
    console.log(`Target article: ${articleId}`);
  }
  console.log("");

  // Fetch articles from Supabase
  console.log("Fetching articles from Supabase...");
  const articles = await fetchArticles(articleId);
  console.log(`Found ${articles.length} article(s)`);

  // Extract tags
  const { results, stats } = await extractTagsForArticles(articles, {
    dryRun,
    onProgress: (current, total) => {
      process.stdout.write(`\rProcessing: ${current}/${total}`);
    },
  });
  console.log(""); // New line after progress

  // Save to Supabase (skip for dry run)
  if (!dryRun && results.length > 0) {
    console.log("\nSaving tags to Supabase...");
    await saveTags(results);
    console.log(`Saved tags for ${results.length} article(s)`);
  }

  // Generate and save report
  const report = generateTagReport(results, stats);
  const reportPath = join(
    process.cwd(),
    "data",
    `tag-report${dryRun ? "-dry" : ""}.md`
  );
  writeFileSync(reportPath, report);
  console.log(`\nReport saved to: ${reportPath}`);

  // Print stats
  printStats(stats, dryRun);

  console.log("\n✅ Tag extraction complete");
}

main().catch((error) => {
  console.error("\n❌ Error:", error.message);
  process.exit(1);
});
