/**
 * 結合テスト実行スクリプト
 * 003-04-00: コンポーネント結合テスト
 *
 * 使用方法:
 *   pnpm --filter @recommend-scp/pipeline exec tsx scripts/integration-test.ts --test <test-name> [options]
 *
 * テスト一覧:
 *   crawler-list      - 記事一覧取得テスト
 *   crawler-content   - 記事本文取得テスト（--id required）
 *   db-insert         - DB保存テスト（--limit optional）
 *   db-upsert         - DB UPSERT テスト（--limit optional）
 *   embedding-generate - Embedding生成テスト（--limit optional）
 *   embedding-save    - Embedding保存テスト（--limit optional）
 *   tagging-extract   - タグ抽出テスト（--limit optional）
 *   tagging-save      - タグ保存テスト（--limit optional）
 *   mail-send         - メール送信テスト
 */

import { parseArgs } from "node:util";

// テスト結果の型定義
interface TestResult {
  success: boolean;
  message: string;
  data?: unknown;
  error?: string;
  durationMs: number;
}

// コマンドライン引数のパース
const { values } = parseArgs({
  options: {
    test: { type: "string", short: "t" },
    id: { type: "string" },
    limit: { type: "string", short: "l", default: "1" },
    help: { type: "boolean", short: "h" },
  },
});

if (values.help || !values.test) {
  console.log(`
結合テスト実行スクリプト

使用方法:
  tsx scripts/integration-test.ts --test <test-name> [options]

オプション:
  --test, -t <name>  実行するテスト名（必須）
  --id <id>          記事ID（crawler-contentで必須）
  --limit, -l <n>    処理件数（デフォルト: 1）
  --help, -h         ヘルプを表示

テスト一覧:
  crawler-list       記事一覧取得テスト
  crawler-content    記事本文取得テスト
  db-insert          DB保存テスト
  db-upsert          DB UPSERTテスト
  embedding-generate Embedding生成テスト
  embedding-save     Embedding保存テスト
  tagging-extract    タグ抽出テスト
  tagging-save       タグ保存テスト
  mail-send          メール送信テスト
  `);
  process.exit(values.help ? 0 : 1);
}

// 結果をJSON形式で出力
function outputResult(result: TestResult): void {
  console.log(JSON.stringify(result, null, 2));
}

// テスト実行関数
async function runTest(testName: string): Promise<TestResult> {
  const startTime = Date.now();

  try {
    switch (testName) {
      case "crawler-list":
        return await testCrawlerList();
      case "crawler-content":
        return await testCrawlerContent(values.id ?? "SCP-173");
      case "db-insert":
        return await testDbInsert(parseInt(values.limit ?? "1", 10));
      case "db-upsert":
        return await testDbUpsert(parseInt(values.limit ?? "1", 10));
      case "embedding-generate":
        return await testEmbeddingGenerate(parseInt(values.limit ?? "1", 10));
      case "embedding-save":
        return await testEmbeddingSave(parseInt(values.limit ?? "1", 10));
      case "tagging-extract":
        return await testTaggingExtract(parseInt(values.limit ?? "1", 10));
      case "tagging-save":
        return await testTaggingSave(parseInt(values.limit ?? "1", 10));
      case "mail-send":
        return await testMailSend();
      default:
        return {
          success: false,
          message: `不明なテスト: ${testName}`,
          durationMs: Date.now() - startTime,
        };
    }
  } catch (error) {
    return {
      success: false,
      message: "テスト実行中にエラーが発生",
      error: error instanceof Error ? error.message : String(error),
      durationMs: Date.now() - startTime,
    };
  }
}

// ========================================
// 個別テスト実装
// ========================================

async function testCrawlerList(): Promise<TestResult> {
  const startTime = Date.now();
  const { EnglishCrawler } = await import("../src/crawler/english-crawler");

  const crawler = new EnglishCrawler();
  const articles = await crawler.fetchArticleList();

  return {
    success: articles.length > 0,
    message: `${String(articles.length)}件の記事を取得`,
    data: { count: articles.length, sample: articles.slice(0, 3) },
    durationMs: Date.now() - startTime,
  };
}

async function testCrawlerContent(id: string): Promise<TestResult> {
  const startTime = Date.now();
  const { EnglishCrawler } = await import("../src/crawler/english-crawler");

  const crawler = new EnglishCrawler();
  const content = await crawler.fetchArticleContent(id);

  return {
    success: content.content.length > 0,
    message: `${id}の本文を取得（${String(content.content.length)}文字）`,
    data: {
      id: content.id,
      title: content.title,
      contentLength: content.content.length,
      tags: content.tags,
    },
    durationMs: Date.now() - startTime,
  };
}

async function testDbInsert(limit: number): Promise<TestResult> {
  const startTime = Date.now();

  // 環境変数チェック
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return {
      success: false,
      message: "環境変数が未設定: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY",
      durationMs: Date.now() - startTime,
    };
  }

  const { createClient } = await import("@supabase/supabase-js");
  const { EnglishCrawler } = await import("../src/crawler/english-crawler");
  const { DbSaver } = await import("../src/crawler/utils/db-saver");

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const crawler = new EnglishCrawler();
  const dbSaver = new DbSaver(supabase, { lang: "en" });

  const articles = await crawler.fetchArticleList();
  const target = articles.slice(0, limit);

  let savedCount = 0;
  for (const article of target) {
    const content = await crawler.fetchArticleContent(article.id);
    await dbSaver.saveArticle(content);
    savedCount++;
  }

  return {
    success: savedCount === limit,
    message: `${String(savedCount)}/${String(limit)}件をDBに保存`,
    data: { savedCount, targetIds: target.map((a) => a.id) },
    durationMs: Date.now() - startTime,
  };
}

async function testDbUpsert(limit: number): Promise<TestResult> {
  // db-insertと同じ処理を2回実行してUPSERTを確認
  const result1 = await testDbInsert(limit);
  if (!result1.success) return result1;

  const startTime = Date.now();
  const result2 = await testDbInsert(limit);

  return {
    success: result2.success,
    message: `UPSERT確認: 2回目の保存も成功`,
    data: { firstRun: result1.data, secondRun: result2.data },
    durationMs: Date.now() - startTime,
  };
}

async function testEmbeddingGenerate(_limit: number): Promise<TestResult> {
  const startTime = Date.now();

  if (!process.env.OPENAI_API_KEY) {
    return {
      success: false,
      message: "環境変数が未設定: OPENAI_API_KEY",
      durationMs: Date.now() - startTime,
    };
  }

  // TODO: 003-03-01実装後に有効化
  return {
    success: false,
    message: "003-03-01未実装のためスキップ",
    durationMs: Date.now() - startTime,
  };
}

async function testEmbeddingSave(_limit: number): Promise<TestResult> {
  const startTime = Date.now();

  // TODO: 003-03-01実装後に有効化
  return {
    success: false,
    message: "003-03-01未実装のためスキップ",
    durationMs: Date.now() - startTime,
  };
}

async function testTaggingExtract(_limit: number): Promise<TestResult> {
  const startTime = Date.now();

  // TODO: 003-03-03実装後に有効化
  return {
    success: false,
    message: "003-03-03未実装のためスキップ",
    durationMs: Date.now() - startTime,
  };
}

async function testTaggingSave(_limit: number): Promise<TestResult> {
  const startTime = Date.now();

  // TODO: 003-03-03実装後に有効化
  return {
    success: false,
    message: "003-03-03未実装のためスキップ",
    durationMs: Date.now() - startTime,
  };
}

async function testMailSend(): Promise<TestResult> {
  const startTime = Date.now();

  // TODO: 003-04-03実装後に有効化
  return {
    success: false,
    message: "003-04-03未実装のためスキップ",
    durationMs: Date.now() - startTime,
  };
}

// メイン実行
runTest(values.test)
  .then(outputResult)
  .catch((error: unknown) => {
    outputResult({
      success: false,
      message: "予期しないエラー",
      error: error instanceof Error ? error.message : String(error),
      durationMs: 0,
    });
    process.exit(1);
  });
