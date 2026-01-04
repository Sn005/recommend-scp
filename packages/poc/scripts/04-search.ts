#!/usr/bin/env tsx
/**
 * Script 04: Run Search Tests
 * Usage: pnpm --filter poc run:04-search [--id SCP-XXX] [--hybrid]
 */

import { vectorSearch } from "../src/search/vector-search.js";
import { hybridSearch } from "../src/search/hybrid-search.js";

async function main() {
  const args = process.argv.slice(2);
  const idIndex = args.indexOf("--id");
  const queryId = idIndex !== -1 ? args[idIndex + 1] : "SCP-173";
  const useHybrid = args.includes("--hybrid");

  console.log(`\n🔍 ${useHybrid ? "ハイブリッド" : "ベクトル"}検索を実行中 (${queryId})...\n`);

  try {
    if (useHybrid) {
      const results = await hybridSearch({
        query_id: queryId,
        embedding_weight: 0.7,
        tag_weight: 0.3,
        limit: 5,
      });
      console.log(`✅ ${results.length}件の結果が見つかりました`);
    } else {
      const response = await vectorSearch({ queryId, limit: 5 });
      console.log(`✅ ${response.results.length}件の結果が見つかりました`);
    }
  } catch (error) {
    console.error("❌ エラー:", error);
    process.exit(1);
  }
}

main();
