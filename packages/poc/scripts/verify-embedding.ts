#!/usr/bin/env tsx
/**
 * Embedding品質検証スクリプト
 * Usage: pnpm --filter poc run:verify-embed [--id SCP-XXX]
 *
 * コサイン類似度で類似記事を検索し、Embeddingがレコメンドに適しているか検証
 */

import "../src/lib/env";
import { getSupabaseAdmin } from "../src/lib/supabase";

interface Article {
  id: string;
  title: string;
}

interface Embedding {
  id: string;
  embedding: number[];
}

interface SimilarArticle {
  id: string;
  title: string;
  similarity: number;
}

function parseArgs(): { articleId: string } {
  const args = process.argv.slice(2);
  const idIndex = args.indexOf("--id");
  return {
    articleId: idIndex !== -1 ? args[idIndex + 1] ?? "SCP-173" : "SCP-173",
  };
}

/**
 * コサイン類似度を計算
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("ベクトルの次元数が一致しません");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  if (magnitude === 0) return 0;

  return dotProduct / magnitude;
}

async function main(): Promise<void> {
  const { articleId } = parseArgs();
  const supabase = getSupabaseAdmin();

  console.log(`\n🔍 Embedding品質検証`);
  console.log(`${"=".repeat(50)}`);
  console.log(`検索対象: ${articleId}\n`);

  // 1. 対象記事を取得
  const { data: queryArticle, error: articleError } = await supabase
    .from("scp_articles")
    .select("id, title")
    .eq("id", articleId)
    .single();

  if (articleError || !queryArticle) {
    console.error(`❌ 記事が見つかりません: ${articleId}\n`);

    // 利用可能な記事一覧を表示
    const { data: availableArticles } = await supabase
      .from("scp_articles")
      .select("id, title")
      .order("id")
      .limit(20);

    if (availableArticles && availableArticles.length > 0) {
      console.log(`📋 利用可能な記事（最初の20件）:\n`);
      availableArticles.forEach((a: Article) => {
        console.log(`  --id ${a.id}  (${a.title})`);
      });
      console.log(`\n使用方法: pnpm --filter poc run:verify-embed -- --id <記事ID>\n`);
    }
    process.exit(1);
  }

  console.log(`📄 対象記事: ${queryArticle.title}`);
  console.log("");

  // 2. 対象記事のEmbeddingを取得
  const { data: queryEmbedding, error: embeddingError } = await supabase
    .from("scp_embeddings")
    .select("id, embedding")
    .eq("id", articleId)
    .single();

  if (embeddingError || !queryEmbedding) {
    console.error(`❌ Embeddingが見つかりません: ${articleId}`);
    process.exit(1);
  }

  // Embeddingをパース（JSON文字列または配列）
  const queryVector: number[] =
    typeof queryEmbedding.embedding === "string"
      ? JSON.parse(queryEmbedding.embedding)
      : queryEmbedding.embedding;

  console.log(`✅ Embedding取得完了（${queryVector.length}次元）`);

  // 3. 全Embeddingを取得
  const { data: allEmbeddings, error: allError } = await supabase
    .from("scp_embeddings")
    .select("id, embedding");

  if (allError || !allEmbeddings) {
    console.error(`❌ Embedding取得失敗: ${allError?.message}`);
    process.exit(1);
  }

  console.log(`📊 総Embedding数: ${allEmbeddings.length}`);

  // 4. 全記事タイトルを取得
  const { data: allArticles, error: articlesError } = await supabase
    .from("scp_articles")
    .select("id, title");

  if (articlesError || !allArticles) {
    console.error(`❌ 記事取得失敗: ${articlesError?.message}`);
    process.exit(1);
  }

  const titleMap = new Map(allArticles.map((a: Article) => [a.id, a.title]));

  // 5. 類似度を計算
  console.log(`\n⏳ 類似度計算中...`);

  const similarities: SimilarArticle[] = allEmbeddings
    .filter((e: Embedding) => e.id !== articleId)
    .map((e: Embedding) => {
      const vector: number[] =
        typeof e.embedding === "string" ? JSON.parse(e.embedding) : e.embedding;
      return {
        id: e.id,
        title: titleMap.get(e.id) ?? "不明",
        similarity: cosineSimilarity(queryVector, vector),
      };
    })
    .sort((a: SimilarArticle, b: SimilarArticle) => b.similarity - a.similarity);

  // 6. TOP10を表示
  console.log(`\n${"=".repeat(50)}`);
  console.log(`🏆 類似記事 TOP10`);
  console.log(`${"=".repeat(50)}\n`);

  const top10 = similarities.slice(0, 10);

  top10.forEach((article, index) => {
    const rank = (index + 1).toString().padStart(2, " ");
    const score = (article.similarity * 100).toFixed(2);
    console.log(`${rank}. [${score}%] ${article.id}: ${article.title}`);
  });

  // 7. 統計情報
  console.log(`\n${"=".repeat(50)}`);
  console.log(`📈 類似度統計`);
  console.log(`${"=".repeat(50)}\n`);

  const scores = similarities.map((s) => s.similarity);
  const avgSimilarity = scores.reduce((a, b) => a + b, 0) / scores.length;
  const maxSimilarity = Math.max(...scores);
  const minSimilarity = Math.min(...scores);

  console.log(`最大: ${(maxSimilarity * 100).toFixed(2)}%`);
  console.log(`最小: ${(minSimilarity * 100).toFixed(2)}%`);
  console.log(`平均: ${(avgSimilarity * 100).toFixed(2)}%`);

  // 8. 評価ガイド
  console.log(`\n${"=".repeat(50)}`);
  console.log(`📋 評価ガイド`);
  console.log(`${"=".repeat(50)}\n`);

  console.log(`類似記事が意味的に関連しているか確認してください:`);
  console.log(`  - 同じジャンル・カテゴリか？`);
  console.log(`  - 似たテーマやコンセプトか？`);
  console.log(`  - 関連するSCPオブジェクトか？`);
  console.log(`\nTOP結果が関連している → Embeddingは正常に機能しています ✅`);
  console.log(`TOP結果がランダム → 調査が必要です ⚠️\n`);
}

main().catch((error) => {
  console.error("エラー:", error.message);
  process.exit(1);
});
