#!/usr/bin/env tsx
/**
 * Script 05: Generate Report
 * Usage: pnpm --filter poc run:05-report [--sample]
 *
 * 実際の検証結果からレポートを生成します。
 * --sample オプションでサンプルデータを使用します。
 */

import "@recommend-scp/shared/lib/env";
import fs from "node:fs/promises";
import path from "node:path";
import { getSupabaseAdmin } from "@recommend-scp/shared/lib/supabase";
import { generateReport, type ReportData } from "../src/report/generate-report";
import { calculateCost } from "@recommend-scp/shared/embedding";
import { calculateTaggingCost } from "@recommend-scp/shared/tagging";
import { vectorSearch, hybridSearch } from "@recommend-scp/shared/search";

/** レポート出力先 */
const REPORT_OUTPUT_PATH = path.resolve(import.meta.dirname, "../../../docs/poc-report.md");

/**
 * Supabaseから実際のデータを収集
 */
async function collectActualData(): Promise<ReportData> {
  const supabase = getSupabaseAdmin();

  // 記事データを取得
  const { data: articles, error: articlesError } = await supabase
    .from("scp_articles")
    .select("id, content");

  if (articlesError) {
    throw new Error(`記事データの取得に失敗: ${articlesError.message}`);
  }

  const articleCount = articles?.length ?? 0;
  const avgContentLength =
    articleCount > 0
      ? Math.round(articles.reduce((sum, a) => sum + a.content.length, 0) / articleCount)
      : 0;

  // Embeddingデータを取得
  const { data: embeddings, error: embeddingsError } = await supabase
    .from("scp_embeddings")
    .select("id");

  if (embeddingsError) {
    throw new Error(`Embeddingデータの取得に失敗: ${embeddingsError.message}`);
  }

  const embeddingCount = embeddings?.length ?? 0;
  // トークン数を推定（1文字≒0.25トークン）
  const estimatedTokens =
    articleCount > 0
      ? Math.round(articles.reduce((sum, a) => sum + a.content.length, 0) * 0.25)
      : 0;
  const embeddingCost = calculateCost(estimatedTokens);

  // タグデータを取得
  const { data: articleTags, error: tagsError } = await supabase
    .from("article_tags")
    .select("article_id");

  if (tagsError) {
    throw new Error(`タグデータの取得に失敗: ${tagsError.message}`);
  }

  const taggedArticleCount = new Set(articleTags?.map((t) => t.article_id) ?? []).size;
  // タグ抽出のトークン数を推定
  const taggingInputTokens = estimatedTokens + articleCount * 500; // プロンプト分
  const taggingOutputTokens = articleCount * 50; // レスポンス分
  const taggingCost = calculateTaggingCost(taggingInputTokens, taggingOutputTokens, "openai");

  // 検索機能の検証（実際の検索関数を使用）
  let vectorSearchSuccess = false;
  let hybridSearchSuccess = false;
  let searchTimeMs = 0;

  if (embeddingCount > 0 && articles && articles.length > 0) {
    // 最初の記事をクエリとしてベクトル検索をテスト
    const testQueryId = articles[0].id;
    console.log(`   🔍 ベクトル検索テスト中 (クエリ: ${testQueryId})...`);

    try {
      const vectorResult = await vectorSearch({
        queryId: testQueryId,
        limit: 5,
      });

      if (vectorResult.results.length > 0) {
        vectorSearchSuccess = true;
        searchTimeMs = vectorResult.searchTimeMs;
        console.log(
          `      ✅ ベクトル検索成功 (${vectorResult.results.length}件, ${searchTimeMs}ms)`
        );
      } else {
        console.log("      ⚠️ ベクトル検索: 結果なし（データ不足の可能性）");
      }
    } catch (error) {
      console.log(`      ❌ ベクトル検索失敗: ${error}`);
    }

    // ハイブリッド検索のテスト
    if (taggedArticleCount > 0) {
      console.log(`   🔍 ハイブリッド検索テスト中 (クエリ: ${testQueryId})...`);

      try {
        const hybridResult = await hybridSearch({
          query_id: testQueryId,
          embedding_weight: 0.7,
          tag_weight: 0.3,
          limit: 5,
        });

        if (hybridResult.length > 0) {
          hybridSearchSuccess = true;
          console.log(`      ✅ ハイブリッド検索成功 (${hybridResult.length}件)`);
        } else {
          console.log("      ⚠️ ハイブリッド検索: 結果なし（データ不足の可能性）");
        }
      } catch (error) {
        console.log(`      ❌ ハイブリッド検索失敗: ${error}`);
      }
    } else {
      console.log("   ⏭️ ハイブリッド検索: タグデータなしのためスキップ");
    }
  } else {
    console.log("   ⏭️ 検索テスト: Embeddingデータなしのためスキップ");
  }

  return {
    dataFetch: {
      success: articleCount > 0,
      articleCount,
      avgContentLength,
    },
    embedding: {
      success: embeddingCount > 0,
      tokenCount: estimatedTokens,
      cost: embeddingCost,
      timeSeconds: embeddingCount * 2.5, // 推定処理時間
    },
    tagging: {
      success: taggedArticleCount > 0,
      tokenCount: taggingInputTokens + taggingOutputTokens,
      cost: taggingCost,
    },
    search: {
      vectorSearchSuccess,
      hybridSearchSuccess,
      searchTimeMs,
    },
  };
}

/**
 * デモ用サンプルデータ
 */
function getSampleReportData(): ReportData {
  return {
    dataFetch: {
      success: true,
      articleCount: 10,
      avgContentLength: 5200,
    },
    embedding: {
      success: true,
      tokenCount: 48500,
      cost: 0.00097,
      timeSeconds: 25,
    },
    tagging: {
      success: true,
      tokenCount: 12000,
      cost: 0.0018,
    },
    search: {
      vectorSearchSuccess: true,
      hybridSearchSuccess: true,
      searchTimeMs: 120,
    },
  };
}

async function main() {
  const useSample = process.argv.includes("--sample");

  console.log("\n📊 PoC検証レポートを生成中...\n");

  try {
    let reportData: ReportData;

    if (useSample) {
      console.log("📋 サンプルデータを使用します");
      reportData = getSampleReportData();
    } else {
      console.log("🔍 Supabaseから実際のデータを収集中...");
      reportData = await collectActualData();
    }

    // レポート生成
    const report = await generateReport(reportData);

    // 出力先ディレクトリを確保
    const docsDir = path.dirname(REPORT_OUTPUT_PATH);
    await fs.mkdir(docsDir, { recursive: true });

    // レポートをファイルに書き込み
    await fs.writeFile(REPORT_OUTPUT_PATH, report, "utf-8");

    console.log(`\n✅ レポート生成完了`);
    console.log(`   📄 出力先: ${REPORT_OUTPUT_PATH}`);
    console.log("");
    console.log("📋 レポートサマリー:");
    console.log(`   - 記事数: ${reportData.dataFetch.articleCount}件`);
    console.log(`   - Embeddingコスト: $${reportData.embedding.cost.toFixed(4)}`);
    console.log(`   - タグ抽出コスト: $${reportData.tagging.cost.toFixed(4)}`);
    console.log(
      `   - 検索: ベクトル=${reportData.search.vectorSearchSuccess ? "✅" : "❌"}, ハイブリッド=${reportData.search.hybridSearchSuccess ? "✅" : "❌"}`
    );
    console.log("\n🎉 完了\n");
  } catch (error) {
    console.error("❌ エラー:", error);
    process.exit(1);
  }
}

main();
