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
import { env } from "@recommend-scp/shared/lib/env";

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

if (values.help === true || values.test === undefined) {
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
  process.exit(values.help === true ? 0 : 1);
}

// 結果をJSON形式で出力
function outputResult(result: TestResult): void {
  console.log(JSON.stringify(result, null, 2));
}

// テスト実行関数
async function runTest(testName: string): Promise<TestResult> {
  const startTime = Date.now();

  try {
    const testId = values.id ?? "SCP-173";
    const limitValue = parseInt(values.limit, 10);

    switch (testName) {
      case "crawler-list":
        return await testCrawlerList();
      case "crawler-content":
        return await testCrawlerContent(testId);
      case "db-insert":
        return await testDbInsert(limitValue);
      case "db-upsert":
        return await testDbUpsert(limitValue);
      case "embedding-generate":
        return await testEmbeddingGenerate();
      case "embedding-save":
        return await testEmbeddingSave();
      case "tagging-extract":
        return await testTaggingExtract();
      case "tagging-save":
        return await testTaggingSave();
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

  const { EnglishCrawler } = await import("../src/crawler/english-crawler");
  const { DbSaver, createSupabaseClient } = await import("../src/crawler/utils/db-saver");

  // env.tsのgetterが未設定時にエラーをスロー
  const supabase = createSupabaseClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

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

async function testEmbeddingGenerate(): Promise<TestResult> {
  const startTime = Date.now();

  const OpenAI = (await import("openai")).default;
  const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

  // テスト用の短いコンテンツでEmbedding生成
  const testContent = "SCP-173 is a sculpture that moves when not observed.";
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: testContent,
  });

  const embedding = response.data[0].embedding;
  const success = embedding.length === 1536;

  return {
    success,
    message: success ? `Embedding生成成功（${String(embedding.length)}次元）` : "Embedding生成失敗",
    data: {
      dimensions: embedding.length,
      tokens: response.usage.total_tokens,
    },
    durationMs: Date.now() - startTime,
  };
}

async function testEmbeddingSave(): Promise<TestResult> {
  const startTime = Date.now();

  const { createClient } = await import("@supabase/supabase-js");
  const OpenAI = (await import("openai")).default;

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

  // テスト用記事を取得
  const { data: article } = await supabase
    .from("scp_articles")
    .select("article_id, content")
    .limit(1)
    .single();

  if (!article) {
    return {
      success: false,
      message: "テスト用記事が見つかりません",
      durationMs: Date.now() - startTime,
    };
  }

  const articleId = article.article_id as string;
  const articleContent = article.content as string;

  // Embedding生成
  const content = articleContent.slice(0, 8000);
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: content,
  });

  const embedding = response.data[0].embedding;

  // DB保存（scp_embeddingsテーブル）
  const { error } = await supabase.from("scp_embeddings").upsert(
    {
      article_id: articleId,
      embedding,
    },
    { onConflict: "article_id" }
  );

  if (error) {
    return {
      success: false,
      message: `EmbeddingDB保存失敗: ${error.message}`,
      data: { articleId },
      durationMs: Date.now() - startTime,
    };
  }

  return {
    success: true,
    message: `EmbeddingDB保存成功（${articleId}）`,
    data: { articleId },
    durationMs: Date.now() - startTime,
  };
}

async function testTaggingExtract(): Promise<TestResult> {
  const startTime = Date.now();

  const OpenAI = (await import("openai")).default;
  const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

  // テスト用の短いコンテンツでタグ抽出
  const testContent = `SCP-173 is a Euclid-class anomaly.
    It is a concrete sculpture that can only move when unobserved.
    Containment requires constant visual observation.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: `Extract tags from this SCP article as JSON:
        {
          "object_class": "Safe|Euclid|Keter|Other",
          "genre": ["horror", "mystery", etc],
          "theme": ["autonomous", "sculpture", etc]
        }

        Article:
        ${testContent}`,
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 200,
  });

  const responseText = response.choices[0]?.message?.content ?? "";
  const tags = JSON.parse(responseText) as Record<string, unknown>;
  const success = "object_class" in tags;

  return {
    success,
    message: success ? `タグ抽出成功` : "タグ抽出失敗",
    data: { tags },
    durationMs: Date.now() - startTime,
  };
}

async function testTaggingSave(): Promise<TestResult> {
  const startTime = Date.now();

  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  // テスト用記事を取得
  const { data: article } = await supabase
    .from("scp_articles")
    .select("article_id")
    .limit(1)
    .single();

  if (!article) {
    return {
      success: false,
      message: "テスト用記事が見つかりません",
      durationMs: Date.now() - startTime,
    };
  }

  const articleId = article.article_id as string;

  // tagsテーブルにテストタグを作成
  const { data: tag } = await supabase
    .from("tags")
    .upsert({ category: "object_class", value: "Euclid" }, { onConflict: "category,value" })
    .select("id")
    .single();

  if (!tag) {
    return {
      success: false,
      message: "タグ作成に失敗",
      durationMs: Date.now() - startTime,
    };
  }

  const tagId = (tag as { id: number }).id;

  // article_tagsテーブルに保存
  const { error } = await supabase.from("article_tags").upsert(
    {
      article_id: articleId,
      tag_id: tagId,
    },
    { onConflict: "article_id,tag_id" }
  );

  if (error) {
    return {
      success: false,
      message: `タグDB保存失敗: ${error.message}`,
      data: { articleId, tagId },
      durationMs: Date.now() - startTime,
    };
  }

  return {
    success: true,
    message: `タグDB保存成功（${articleId}）`,
    data: { articleId, tagId },
    durationMs: Date.now() - startTime,
  };
}

async function testMailSend(): Promise<TestResult> {
  const startTime = Date.now();

  const { NotificationService } = await import("../src/orchestrator/notification-service");

  // モックメーラーでテスト
  const sentEmails: { to: string; subject: string; body: string }[] = [];
  const mockMailer = {
    send: (options: {
      to: string;
      subject: string;
      body: string;
    }): Promise<{ success: boolean }> => {
      sentEmails.push(options);
      return Promise.resolve({ success: true });
    },
  };

  const notificationService = new NotificationService({
    enabled: true,
    email: "test@example.com",
    mailer: mockMailer,
  });

  await notificationService.sendPipelineSummary({
    runId: "test-run-id",
    mode: "integration-test",
    status: "completed",
    stats: {
      totalCost: 0.01,
      duration: 1000,
      embedding: { processed: 10, succeeded: 9, failed: 1, cost: 0.005 },
      tagging: { processed: 10, succeeded: 10, failed: 0, cost: 0.005 },
    },
    errors: [],
  });

  const success = sentEmails.length > 0;

  return {
    success,
    message: success ? "メール送信テスト成功（モック）" : "メール送信テスト失敗",
    data: sentEmails[0],
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
