#!/usr/bin/env tsx
/**
 * Script 01: Fetch SCP Articles
 * Usage: pnpm --filter poc run:01-fetch [--limit N]
 */

import { fetchScpArticles } from "../src/crawler/fetch-scp.js";

async function main() {
  const args = process.argv.slice(2);
  const limitIndex = args.indexOf("--limit");
  const limit = limitIndex !== -1 ? parseInt(args[limitIndex + 1], 10) : 10;

  console.log(`\n📥 Fetching SCP articles (limit: ${limit})...\n`);

  try {
    const articles = await fetchScpArticles({ limit });
    console.log(`✅ Fetched ${articles.length} articles`);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

main();
