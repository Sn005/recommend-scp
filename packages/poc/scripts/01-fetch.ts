#!/usr/bin/env tsx
/**
 * Script 01: Fetch SCP Articles
 * Usage: pnpm --filter poc run:01-fetch [--limit N] [--no-db] [--no-local]
 */

import "@recommend-scp/shared/lib/env";
import { mkdir, writeFile } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { fetchScpArticles } from "@recommend-scp/pipeline/crawler";
import { createSupabaseAdmin } from "@recommend-scp/shared/lib/supabase";
import type { ScpArticleRaw } from "@recommend-scp/shared/types";

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
    throw new Error(`Supabaseへの保存に失敗: ${error.message}`);
  }

  return records.length;
};

const main = async (): Promise<void> => {
  const options = parseArgs(process.argv.slice(2));

  console.log(`\n📥 SCP記事を取得中 (上限: ${options.limit}件)...\n`);

  try {
    const articles = await fetchScpArticles({ limit: options.limit });
    console.log(`\n✅ ${articles.length}件の記事を取得しました\n`);

    // サンプル表示
    if (articles.length > 0) {
      console.log("サンプル記事:");
      articles.slice(0, 3).forEach((a) => {
        console.log(`  - ${a.id}: ${a.title} (評価: ${a.rating}, ${a.content.length}文字)`);
      });
      console.log("");
    }

    // ローカルに保存
    if (options.saveLocal) {
      const filepath = await saveToLocal(articles);
      console.log(`💾 ローカルに保存しました: ${filepath}`);
    }

    // Supabaseに保存
    if (options.saveDb) {
      const count = await saveToSupabase(articles);
      console.log(`🗄️  Supabaseに${count}件の記事を保存しました`);
    }

    console.log("\n🎉 完了\n");
  } catch (error) {
    console.error("❌ エラー:", error);
    process.exit(1);
  }
};

main();
