#!/usr/bin/env tsx
/**
 * Script 01: Fetch SCP Articles
 * Usage: pnpm --filter poc run:01-fetch [--limit N] [--no-db] [--no-local]
 */

import "../src/lib/env";
import { mkdir, writeFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { fetchScpArticles } from "../src/crawler/fetch-scp";
import { createSupabaseAdmin } from "../src/lib/supabase";
import type { ScpArticleRaw } from "../src/types";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_DIR = join(__dirname, "../data/raw");

interface CliOptions {
  limit: number;
  saveLocal: boolean;
  saveDb: boolean;
}

const parseArgs = (args: string[]): CliOptions => {
  const limitIndex = args.indexOf("--limit");
  return {
    limit: limitIndex !== -1 ? parseInt(args[limitIndex + 1], 10) : 10,
    saveLocal: !args.includes("--no-local"),
    saveDb: !args.includes("--no-db"),
  };
};

const saveToLocal = async (articles: ScpArticleRaw[]): Promise<string> => {
  await mkdir(DATA_DIR, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `scp-articles-${timestamp}.json`;
  const filepath = join(DATA_DIR, filename);
  await writeFile(filepath, JSON.stringify(articles, null, 2));
  return filepath;
};

const saveToSupabase = async (articles: ScpArticleRaw[]): Promise<number> => {
  const supabase = createSupabaseAdmin();

  const records = articles.map((article) => ({
    id: article.id,
    title: article.title,
    content: article.content,
    rating: article.rating,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from("scp_articles").upsert(records, {
    onConflict: "id",
  });

  if (error) {
    throw new Error(`Supabase upsert failed: ${error.message}`);
  }

  return records.length;
};

const main = async (): Promise<void> => {
  const options = parseArgs(process.argv.slice(2));

  console.log(`\n📥 Fetching SCP articles (limit: ${options.limit})...\n`);

  try {
    const articles = await fetchScpArticles({ limit: options.limit });
    console.log(`\n✅ Fetched ${articles.length} articles\n`);

    // Show sample
    if (articles.length > 0) {
      console.log("Sample articles:");
      articles.slice(0, 3).forEach((a) => {
        console.log(`  - ${a.id}: ${a.title} (rating: ${a.rating}, ${a.content.length} chars)`);
      });
      console.log("");
    }

    // Save to local
    if (options.saveLocal) {
      const filepath = await saveToLocal(articles);
      console.log(`💾 Saved to ${filepath}`);
    }

    // Save to Supabase
    if (options.saveDb) {
      const count = await saveToSupabase(articles);
      console.log(`🗄️  Upserted ${count} articles to Supabase`);
    }

    console.log("\n🎉 Done!\n");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

main();
