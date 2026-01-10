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

    console.log("✅ Search completed successfully\n");
  } catch (error) {
    console.error("❌ エラー:", error);
    process.exit(1);
  }
}

main();
