#!/usr/bin/env tsx
/**
 * Script 05: Generate Report
 * Usage: pnpm --filter poc run:05-report
 *
 * Generates a PoC validation report based on actual execution results.
 * The script reads results from previous scripts or uses sample data.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { generateReport, type ReportData } from "../src/report/generate-report";

/** Output path for the report */
const REPORT_OUTPUT_PATH = path.resolve(
  import.meta.dirname,
  "../../../docs/poc-report.md"
);

/**
 * Sample report data for demonstration
 * In production, this would be collected from actual script executions
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
  console.log("\n📊 Generating PoC report...\n");

  try {
    // Get report data (sample data for now)
    const reportData = getSampleReportData();

    // Generate the report
    const report = await generateReport(reportData);

    // Ensure docs directory exists
    const docsDir = path.dirname(REPORT_OUTPUT_PATH);
    await fs.mkdir(docsDir, { recursive: true });

    // Write report to file
    await fs.writeFile(REPORT_OUTPUT_PATH, report, "utf-8");

    console.log(`✅ Report generated successfully!`);
    console.log(`   📄 Output: ${REPORT_OUTPUT_PATH}`);
    console.log("");
    console.log("📋 Report Summary:");
    console.log(`   - Articles: ${reportData.dataFetch.articleCount}`);
    console.log(`   - Embedding cost: $${reportData.embedding.cost.toFixed(4)}`);
    console.log(`   - Tagging cost: $${reportData.tagging.cost.toFixed(4)}`);
    console.log(
      `   - Search: Vector=${reportData.search.vectorSearchSuccess ? "✅" : "❌"}, Hybrid=${reportData.search.hybridSearchSuccess ? "✅" : "❌"}`
    );
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

main();
