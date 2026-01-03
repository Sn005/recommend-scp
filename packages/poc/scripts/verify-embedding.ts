#!/usr/bin/env tsx
/**
 * Embedding Quality Verification Script
 * Usage: pnpm --filter poc run:verify-embed [--id SCP-XXX]
 *
 * Verifies that embeddings are suitable for recommendation by:
 * 1. Finding similar articles using cosine similarity
 * 2. Displaying results for human evaluation
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
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Vectors must have same length");
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

  console.log(`\n🔍 Embedding Quality Verification`);
  console.log(`${"=".repeat(50)}`);
  console.log(`Query Article: ${articleId}\n`);

  // 1. Fetch query article info
  const { data: queryArticle, error: articleError } = await supabase
    .from("scp_articles")
    .select("id, title")
    .eq("id", articleId)
    .single();

  if (articleError || !queryArticle) {
    console.error(`❌ Article not found: ${articleId}\n`);

    // Show available articles
    const { data: availableArticles } = await supabase
      .from("scp_articles")
      .select("id, title")
      .order("id")
      .limit(20);

    if (availableArticles && availableArticles.length > 0) {
      console.log(`📋 Available articles (showing first 20):\n`);
      availableArticles.forEach((a: Article) => {
        console.log(`  --id ${a.id}  (${a.title})`);
      });
      console.log(`\nUsage: pnpm --filter poc run:verify-embed -- --id <article_id>\n`);
    }
    process.exit(1);
  }

  console.log(`📄 Query: ${queryArticle.title}`);
  console.log("");

  // 2. Fetch query embedding
  const { data: queryEmbedding, error: embeddingError } = await supabase
    .from("scp_embeddings")
    .select("id, embedding")
    .eq("id", articleId)
    .single();

  if (embeddingError || !queryEmbedding) {
    console.error(`❌ Embedding not found for: ${articleId}`);
    process.exit(1);
  }

  // Parse embedding (stored as JSON string or array)
  const queryVector: number[] =
    typeof queryEmbedding.embedding === "string"
      ? JSON.parse(queryEmbedding.embedding)
      : queryEmbedding.embedding;

  console.log(`✅ Embedding found (${queryVector.length} dimensions)`);

  // 3. Fetch all embeddings
  const { data: allEmbeddings, error: allError } = await supabase
    .from("scp_embeddings")
    .select("id, embedding");

  if (allError || !allEmbeddings) {
    console.error(`❌ Failed to fetch embeddings: ${allError?.message}`);
    process.exit(1);
  }

  console.log(`📊 Total embeddings: ${allEmbeddings.length}`);

  // 4. Fetch all article titles
  const { data: allArticles, error: articlesError } = await supabase
    .from("scp_articles")
    .select("id, title");

  if (articlesError || !allArticles) {
    console.error(`❌ Failed to fetch articles: ${articlesError?.message}`);
    process.exit(1);
  }

  const titleMap = new Map(allArticles.map((a: Article) => [a.id, a.title]));

  // 5. Calculate similarities
  console.log(`\n⏳ Calculating similarities...`);

  const similarities: SimilarArticle[] = allEmbeddings
    .filter((e: Embedding) => e.id !== articleId)
    .map((e: Embedding) => {
      const vector: number[] =
        typeof e.embedding === "string" ? JSON.parse(e.embedding) : e.embedding;
      return {
        id: e.id,
        title: titleMap.get(e.id) ?? "Unknown",
        similarity: cosineSimilarity(queryVector, vector),
      };
    })
    .sort((a: SimilarArticle, b: SimilarArticle) => b.similarity - a.similarity);

  // 6. Display TOP 10 results
  console.log(`\n${"=".repeat(50)}`);
  console.log(`🏆 TOP 10 Similar Articles`);
  console.log(`${"=".repeat(50)}\n`);

  const top10 = similarities.slice(0, 10);

  top10.forEach((article, index) => {
    const rank = (index + 1).toString().padStart(2, " ");
    const score = (article.similarity * 100).toFixed(2);
    console.log(`${rank}. [${score}%] ${article.id}: ${article.title}`);
  });

  // 7. Statistics
  console.log(`\n${"=".repeat(50)}`);
  console.log(`📈 Similarity Statistics`);
  console.log(`${"=".repeat(50)}\n`);

  const scores = similarities.map((s) => s.similarity);
  const avgSimilarity = scores.reduce((a, b) => a + b, 0) / scores.length;
  const maxSimilarity = Math.max(...scores);
  const minSimilarity = Math.min(...scores);

  console.log(`Max:  ${(maxSimilarity * 100).toFixed(2)}%`);
  console.log(`Min:  ${(minSimilarity * 100).toFixed(2)}%`);
  console.log(`Avg:  ${(avgSimilarity * 100).toFixed(2)}%`);

  // 8. Evaluation guide
  console.log(`\n${"=".repeat(50)}`);
  console.log(`📋 Evaluation Guide`);
  console.log(`${"=".repeat(50)}\n`);

  console.log(`Check if the similar articles are semantically related:`);
  console.log(`  - Same genre/category?`);
  console.log(`  - Similar themes or concepts?`);
  console.log(`  - Related SCP objects?`);
  console.log(`\nIf TOP results are relevant → Embeddings are working! ✅`);
  console.log(`If TOP results are random → Need investigation ⚠️\n`);
}

main().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});
