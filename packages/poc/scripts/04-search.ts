#!/usr/bin/env tsx
/**
 * Script 04: Run Search Tests
 * Usage:
 *   pnpm --filter poc run:04-search [--id SCP-XXX] [--limit N]
 *   pnpm --filter poc run:04-search --hybrid --id SCP-XXX [--embedding-weight 0.7] [--tag-weight 0.3]
 *   pnpm --filter poc run:04-search --compare --id SCP-XXX
 */

import "../src/lib/env";
import { vectorSearch } from "../src/search/vector-search";
import { hybridSearch } from "../src/search/hybrid-search";

function parseArgs() {
  const args = process.argv.slice(2);

  const getArgValue = (flag: string): string | undefined => {
    const index = args.indexOf(flag);
    return index !== -1 ? args[index + 1] : undefined;
  };

  return {
    queryId: getArgValue("--id") || "SCP-173",
    limit: parseInt(getArgValue("--limit") || "5", 10),
    useHybrid: args.includes("--hybrid"),
    compare: args.includes("--compare"),
    embeddingWeight: parseFloat(getArgValue("--embedding-weight") || "0.7"),
    tagWeight: parseFloat(getArgValue("--tag-weight") || "0.3"),
  };
}

async function runVectorSearch(queryId: string, limit: number) {
  console.log(`\n🔍 Vector Search for "${queryId}" (limit: ${limit})\n`);
  console.log("=".repeat(60));

  const response = await vectorSearch({ queryId, limit });

  console.log(`\nQuery: ${response.queryTitle} (${response.queryId})`);
  console.log(`Search Time: ${response.searchTimeMs}ms`);
  console.log(`\nTop ${response.results.length} Similar Articles:\n`);

  response.results.forEach((result, index) => {
    const score = (result.similarityScore * 100).toFixed(1);
    console.log(`  ${index + 1}. [${score}%] ${result.title} (${result.articleId})`);
  });

  console.log("\n" + "=".repeat(60));

  return response;
}

async function runHybridSearch(
  queryId: string,
  limit: number,
  embeddingWeight: number,
  tagWeight: number
) {
  console.log(`\n🔀 Hybrid Search for "${queryId}"`);
  console.log(`   Weights: embedding=${embeddingWeight}, tag=${tagWeight}`);
  console.log("=".repeat(60));

  const results = await hybridSearch({
    query_id: queryId,
    embedding_weight: embeddingWeight,
    tag_weight: tagWeight,
    limit,
  });

  console.log(`\nTop ${results.length} Results:\n`);

  results.forEach((result, index) => {
    const finalScore = (result.similarity_score * 100).toFixed(1);
    const embScore = (result.embedding_score * 100).toFixed(1);
    const tagScore = (result.tag_score * 100).toFixed(1);
    console.log(`  ${index + 1}. [Final: ${finalScore}%] ${result.title} (${result.id})`);
    console.log(`     Embedding: ${embScore}%, Tag: ${tagScore}%`);
  });

  console.log("\n" + "=".repeat(60));

  return results;
}

async function runComparison(queryId: string, limit: number) {
  console.log(`\n📊 Comparison: Vector vs Hybrid for "${queryId}"\n`);
  console.log("=".repeat(60));

  // Run vector search
  const vectorResponse = await vectorSearch({ queryId, limit });

  // Run hybrid search
  const hybridResults = await hybridSearch({
    query_id: queryId,
    embedding_weight: 0.7,
    tag_weight: 0.3,
    limit,
  });

  console.log(`\nQuery: ${vectorResponse.queryTitle} (${queryId})\n`);

  console.log("┌" + "─".repeat(30) + "┬" + "─".repeat(30) + "┐");
  console.log("│ Vector Only".padEnd(31) + "│ Hybrid (0.7/0.3)".padEnd(31) + "│");
  console.log("├" + "─".repeat(30) + "┼" + "─".repeat(30) + "┤");

  const maxLen = Math.max(vectorResponse.results.length, hybridResults.length);
  for (let i = 0; i < maxLen; i++) {
    const vr = vectorResponse.results[i];
    const hr = hybridResults[i];

    const vCell = vr
      ? `${(vr.similarityScore * 100).toFixed(0)}% ${vr.articleId}`.padEnd(30)
      : " ".repeat(30);
    const hCell = hr
      ? `${(hr.similarity_score * 100).toFixed(0)}% ${hr.id}`.padEnd(30)
      : " ".repeat(30);

    console.log(`│ ${vCell}│ ${hCell}│`);
  }

  console.log("└" + "─".repeat(30) + "┴" + "─".repeat(30) + "┘");
  console.log();
}

async function main() {
  const { queryId, limit, useHybrid, compare, embeddingWeight, tagWeight } =
    parseArgs();

  try {
    if (compare) {
      await runComparison(queryId, limit);
    } else if (useHybrid) {
      await runHybridSearch(queryId, limit, embeddingWeight, tagWeight);
    } else {
      await runVectorSearch(queryId, limit);
    }

    console.log("✅ Search completed successfully\n");
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

main();
