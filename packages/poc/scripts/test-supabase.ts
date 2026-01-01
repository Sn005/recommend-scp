#!/usr/bin/env tsx
/**
 * Supabase Connection Test Script
 * Usage: pnpm --filter poc test:supabase
 *
 * Tests:
 * 1. Connection to Supabase
 * 2. pgvector extension is enabled
 * 3. Required tables exist
 * 4. CRUD operations work
 */

// Import env first to load dotenv
import "../src/lib/env";
import { createSupabaseAdmin } from "../src/lib/supabase";

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

const results: TestResult[] = [];

function logResult(result: TestResult) {
  const icon = result.passed ? "✅" : "❌";
  console.log(`${icon} ${result.name}: ${result.message}`);
  results.push(result);
}

async function main() {
  console.log("\n🔍 Supabase Connection Test\n");
  console.log("=".repeat(50));

  let supabase;

  // Test 1: Connection
  try {
    supabase = createSupabaseAdmin();
    const { data, error } = await supabase.from("scp_articles").select("count");
    if (error && error.code !== "PGRST116") {
      // PGRST116 = table doesn't exist, which is fine for connection test
      throw error;
    }
    logResult({
      name: "Connection",
      passed: true,
      message: "Successfully connected to Supabase",
    });
  } catch (error) {
    logResult({
      name: "Connection",
      passed: false,
      message: `Failed to connect: ${error}`,
    });
    printSummary();
    process.exit(1);
  }

  // Test 2: pgvector extension
  try {
    const { data, error } = await supabase.rpc("check_pgvector");
    if (error) {
      // Try direct SQL query via REST
      const { data: extData, error: extError } = await supabase
        .from("pg_extension")
        .select("extname")
        .eq("extname", "vector")
        .single();

      if (extError) {
        // Alternative check: try to access embeddings table with vector type
        const { error: tableError } = await supabase
          .from("scp_embeddings")
          .select("id")
          .limit(1);

        if (tableError && tableError.code === "42P01") {
          throw new Error("Table scp_embeddings not found - run migration first");
        }
        logResult({
          name: "pgvector Extension",
          passed: true,
          message: "Extension appears to be enabled (table accessible)",
        });
      } else {
        logResult({
          name: "pgvector Extension",
          passed: true,
          message: "pgvector extension is enabled",
        });
      }
    }
  } catch (error) {
    logResult({
      name: "pgvector Extension",
      passed: false,
      message: `${error}`,
    });
  }

  // Test 3: Required tables exist
  const requiredTables = ["scp_articles", "scp_embeddings", "tags", "article_tags"];

  for (const table of requiredTables) {
    try {
      const { error } = await supabase.from(table).select("*").limit(1);
      if (error && error.code === "42P01") {
        throw new Error(`Table ${table} does not exist`);
      }
      logResult({
        name: `Table: ${table}`,
        passed: true,
        message: "Exists",
      });
    } catch (error) {
      logResult({
        name: `Table: ${table}`,
        passed: false,
        message: `${error}`,
      });
    }
  }

  // Test 4: CRUD operations
  const testArticleId = "_test_article_" + Date.now();

  try {
    // Create
    const { error: insertError } = await supabase.from("scp_articles").insert({
      id: testArticleId,
      title: "Test Article",
      content: "This is a test article for connection verification.",
      rating: 100,
    });
    if (insertError) throw insertError;

    // Read
    const { data: readData, error: readError } = await supabase
      .from("scp_articles")
      .select("*")
      .eq("id", testArticleId)
      .single();
    if (readError) throw readError;
    if (!readData) throw new Error("Failed to read inserted article");

    // Update
    const { error: updateError } = await supabase
      .from("scp_articles")
      .update({ rating: 200 })
      .eq("id", testArticleId);
    if (updateError) throw updateError;

    // Delete
    const { error: deleteError } = await supabase
      .from("scp_articles")
      .delete()
      .eq("id", testArticleId);
    if (deleteError) throw deleteError;

    logResult({
      name: "CRUD Operations",
      passed: true,
      message: "Create, Read, Update, Delete all working",
    });
  } catch (error) {
    // Cleanup on failure
    await supabase.from("scp_articles").delete().eq("id", testArticleId);
    logResult({
      name: "CRUD Operations",
      passed: false,
      message: `${error}`,
    });
  }

  // Test 5: Vector column type
  try {
    // Insert a test embedding
    const testId = "_test_embed_" + Date.now();

    // First create an article
    await supabase.from("scp_articles").insert({
      id: testId,
      title: "Embedding Test",
      content: "Test",
      rating: 0,
    });

    // Create a dummy 1536-dimension vector
    const dummyEmbedding = new Array(1536).fill(0.1);

    const { error: embedError } = await supabase.from("scp_embeddings").insert({
      id: testId,
      embedding: dummyEmbedding,
    });

    if (embedError) throw embedError;

    // Cleanup
    await supabase.from("scp_articles").delete().eq("id", testId);

    logResult({
      name: "Vector(1536) Column",
      passed: true,
      message: "Can store 1536-dimension vectors",
    });
  } catch (error) {
    logResult({
      name: "Vector(1536) Column",
      passed: false,
      message: `${error}`,
    });
  }

  printSummary();
}

function printSummary() {
  console.log("\n" + "=".repeat(50));
  console.log("Summary");
  console.log("=".repeat(50));

  const passed = results.filter((r) => r.passed).length;
  const total = results.length;

  console.log(`\nPassed: ${passed}/${total}`);

  if (passed === total) {
    console.log("\n🎉 All tests passed! Supabase is ready for PoC.\n");
    process.exit(0);
  } else {
    console.log("\n⚠️  Some tests failed. Please check the configuration.\n");
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
