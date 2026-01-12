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

async function saveTags(results: TaggingResult[]): Promise<void> {
  const supabase = getSupabaseAdmin();

  for (const result of results) {
    // この記事の全タグを収集
    const allTags = [
      { category: "object_class", value: result.tags.object_class },
      ...result.tags.genre.map((v) => ({ category: "genre", value: v })),
      ...result.tags.theme.map((v) => ({ category: "theme", value: v })),
      { category: "format", value: result.tags.format },
    ];

    // タグをupsertしてIDを取得
    const tagIds: number[] = [];
    for (const tag of allTags) {
      // 既存タグを検索または新規作成
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
          console.error(`タグの挿入に失敗 ${tag.category}:${tag.value}: ${insertError.message}`);
          continue;
        }
        if (newTag) {
          tagIds.push(newTag.id);
        }
      }
    }

    // この記事の既存タグリンクを削除
    await supabase.from("article_tags").delete().eq("article_id", result.articleId);

    // 新しいタグリンクを挿入
    if (tagIds.length > 0) {
      const articleTags = tagIds.map((tagId) => ({
        article_id: result.articleId,
        tag_id: tagId,
      }));

      const { error: linkError } = await supabase.from("article_tags").insert(articleTags);

      if (linkError) {
        console.error(`タグのリンクに失敗 ${result.articleId}: ${linkError.message}`);
      }
    }
  }
}

function printStats(stats: TaggingStats, dryRun: boolean): void {
  console.log("\n--- 結果 ---");
  console.log(`対象記事数: ${stats.totalArticles}`);
  console.log(`成功: ${stats.successCount}`);
  console.log(`エラー: ${stats.errorCount}`);
  console.log(
    `入力トークン数: ${stats.totalInputTokens.toLocaleString()}${dryRun ? " (推定)" : ""}`
  );
  console.log(
    `出力トークン数: ${stats.totalOutputTokens.toLocaleString()}${dryRun ? " (推定)" : ""}`
  );
  console.log(`推定コスト: $${stats.estimatedCost.toFixed(6)}`);

  if (!dryRun) {
    console.log("\n--- ユニークタグ ---");
    console.log(`オブジェクトクラス: ${stats.uniqueTags.object_class.join(", ")}`);
    console.log(`ジャンル: ${stats.uniqueTags.genre.join(", ")}`);
    console.log(`テーマ: ${stats.uniqueTags.theme.join(", ")}`);
    console.log(`フォーマット: ${stats.uniqueTags.format.join(", ")}`);
  }

  if (stats.errors.length > 0) {
    console.log("\n--- エラー詳細 ---");
    stats.errors.forEach((e) => {
      console.log(`  ${e.articleId}: ${e.error}`);
    });
  }
}

async function main(): Promise<void> {
  const { dryRun, articleId } = parseArgs();

  console.log(`\n🏷️  タグ抽出中${dryRun ? " (ドライラン)" : ""}...`);
  if (articleId) {
    console.log(`対象記事: ${articleId}`);
  }
  console.log("");

  // Supabaseから記事を取得
  console.log("Supabaseから記事を取得中...");
  const articles = await fetchArticles(articleId);
  console.log(`${articles.length}件の記事を取得しました`);

  // タグ抽出
  const { results, stats } = await extractTagsForArticles(articles, {
    dryRun,
    onProgress: (current, total) => {
      process.stdout.write(`\r処理中: ${current}/${total}`);
    },
  });
  console.log(""); // 改行

  // Supabaseに保存 (ドライランはスキップ)
  if (!dryRun && results.length > 0) {
    console.log("\nSupabaseにタグを保存中...");
    await saveTags(results);
    console.log(`${results.length}件の記事のタグを保存しました`);
  }

  // レポートを生成・保存
  const report = generateTagReport(results, stats);
  const reportPath = join(process.cwd(), "data", `tag-report${dryRun ? "-dry" : ""}.md`);
  writeFileSync(reportPath, report);
  console.log(`\nレポートを保存しました: ${reportPath}`);

  // 統計を表示
  printStats(stats, dryRun);

  console.log("\n✅ タグ抽出完了");
}

main().catch((error) => {
  console.error("\n❌ エラー:", error.message);
  process.exit(1);
});
