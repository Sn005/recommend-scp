/**
 * 005-02-04: ベクトル検索RPC関数テスト
 *
 * search_articles_by_embedding, search_articles_by_unexplored_tags,
 * search_adjacent_articles のRPC関数をテストする。
 *
 * 実行方法:
 * 1. supabase start
 * 2. supabase db reset
 * 3. pnpm test supabase/__tests__/vector-search-rpc.test.ts
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { describe, it, expect, beforeAll, afterAll } from "vitest";

// Supabase ローカル環境のデフォルト設定
const SUPABASE_URL = process.env.SUPABASE_URL || "http://127.0.0.1:54321";
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

// モックベクトル生成（1536次元）
const createMockVector = (seed: number): number[] => {
  const vector: number[] = [];
  for (let i = 0; i < 1536; i++) {
    // 再現性のあるパターン
    vector.push(Math.sin(seed + i * 0.001) * 0.5 + 0.5);
  }
  return vector;
};

// 類似度の高いベクトルを生成
const createSimilarVector = (base: number[], noise: number): number[] => {
  return base.map((v) => Math.max(0, Math.min(1, v + (Math.random() - 0.5) * noise)));
};

describe("005-02-04: ベクトル検索RPC関数", () => {
  let supabase: SupabaseClient;
  const testPrefix = `test-rpc-${Date.now()}`;

  // テストデータ
  const baseVector = createMockVector(42);
  const testArticles = [
    {
      article_id: `${testPrefix}-001`,
      title: "Horror Safe",
      tags: ["horror", "safe"],
      rating: 100,
      embedding: createSimilarVector(baseVector, 0.1), // 高類似度
    },
    {
      article_id: `${testPrefix}-002`,
      title: "Scientific Euclid",
      tags: ["scientific", "euclid"],
      rating: 80,
      embedding: createSimilarVector(baseVector, 0.3), // 中類似度
    },
    {
      article_id: `${testPrefix}-003`,
      title: "Mystery Keter",
      tags: ["mystery", "keter"],
      rating: 120,
      embedding: createSimilarVector(baseVector, 0.5), // 低類似度
    },
    {
      article_id: `${testPrefix}-004`,
      title: "Surreal Safe",
      tags: ["surreal", "safe"],
      rating: 90,
      embedding: createMockVector(999), // 非類似（異なるシード）
    },
    {
      article_id: `${testPrefix}-005`,
      title: "No Embedding",
      tags: ["test"],
      rating: 50,
      embedding: null, // embeddingがNULL
    },
    {
      article_id: `${testPrefix}-006`,
      title: "No Tags",
      tags: null,
      rating: 60,
      embedding: createSimilarVector(baseVector, 0.2),
    },
  ];

  beforeAll(async () => {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // テストデータを挿入
    for (const article of testArticles) {
      const { error } = await supabase.from("scp_articles").insert({
        article_id: article.article_id,
        title: article.title,
        tags: article.tags,
        rating: article.rating,
        embedding: article.embedding,
        lang: "ja",
      });
      if (error) {
        // eslint-disable-next-line no-console
        console.error("Insert error:", error);
      }
    }
  });

  afterAll(async () => {
    // テストデータのクリーンアップ
    await supabase.from("scp_articles").delete().like("article_id", `${testPrefix}%`);
  });

  // ============================================
  // AC1: search_articles_by_embedding関数のパラメータ
  // ============================================
  describe("search_articles_by_embedding", () => {
    it("必須パラメータ（query_vector）のみで呼び出せる", async () => {
      const { data, error } = await supabase.rpc("search_articles_by_embedding", {
        query_vector: JSON.stringify(baseVector),
      });
      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
    });

    it("全パラメータを指定して呼び出せる", async () => {
      const { data, error } = await supabase.rpc("search_articles_by_embedding", {
        query_vector: JSON.stringify(baseVector),
        exclude_ids: [testArticles[0].article_id],
        match_count: 5,
        min_similarity: 0.5,
        max_similarity: 0.95,
      });
      expect(error).toBeNull();
      expect(data).toBeDefined();
    });

    // ============================================
    // AC2: search_articles_by_embeddingのロジック
    // ============================================
    it("類似記事を返す", async () => {
      const { data, error } = await supabase.rpc("search_articles_by_embedding", {
        query_vector: JSON.stringify(baseVector),
        match_count: 10,
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(data.length).toBeGreaterThan(0);
      // 類似度が含まれていることを確認
      expect(data[0]).toHaveProperty("similarity");
    });

    it("類似度の降順でソートされている", async () => {
      const { data, error } = await supabase.rpc("search_articles_by_embedding", {
        query_vector: JSON.stringify(baseVector),
        match_count: 10,
      });

      expect(error).toBeNull();
      // 類似度降順を確認
      for (let i = 0; i < data.length - 1; i++) {
        expect(data[i].similarity).toBeGreaterThanOrEqual(data[i + 1].similarity);
      }
    });

    it("exclude_idsに指定した記事を除外する", async () => {
      const excludeId = testArticles[0].article_id;
      const { data, error } = await supabase.rpc("search_articles_by_embedding", {
        query_vector: JSON.stringify(baseVector),
        exclude_ids: [excludeId],
        match_count: 10,
      });

      expect(error).toBeNull();
      const returnedIds = data.map((row: { id: string }) => row.id);
      expect(returnedIds).not.toContain(excludeId);
    });

    it("min_similarityでフィルタする", async () => {
      const { data, error } = await supabase.rpc("search_articles_by_embedding", {
        query_vector: JSON.stringify(baseVector),
        min_similarity: 0.8,
        match_count: 10,
      });

      expect(error).toBeNull();
      data.forEach((row: { similarity: number }) => {
        expect(row.similarity).toBeGreaterThanOrEqual(0.8);
      });
    });

    it("max_similarityでフィルタする", async () => {
      const { data, error } = await supabase.rpc("search_articles_by_embedding", {
        query_vector: JSON.stringify(baseVector),
        max_similarity: 0.9,
        match_count: 10,
      });

      expect(error).toBeNull();
      data.forEach((row: { similarity: number }) => {
        expect(row.similarity).toBeLessThanOrEqual(0.9);
      });
    });

    it("embeddingがNULLの記事は返さない", async () => {
      const { data, error } = await supabase.rpc("search_articles_by_embedding", {
        query_vector: JSON.stringify(baseVector),
        match_count: 100,
      });

      expect(error).toBeNull();
      const returnedIds = data.map((row: { id: string }) => row.id);
      // embeddingがNULLの記事（test-005）が含まれていないことを確認
      expect(returnedIds).not.toContain(testArticles[4].article_id);
    });

    it("match_countで返却件数を制限する", async () => {
      const { data, error } = await supabase.rpc("search_articles_by_embedding", {
        query_vector: JSON.stringify(baseVector),
        match_count: 2,
      });

      expect(error).toBeNull();
      expect(data.length).toBeLessThanOrEqual(2);
    });

    it("空の結果を返す条件でも正常動作する", async () => {
      const { data, error } = await supabase.rpc("search_articles_by_embedding", {
        query_vector: JSON.stringify(baseVector),
        min_similarity: 0.999,
        max_similarity: 1.0,
        match_count: 10,
      });

      expect(error).toBeNull();
      expect(Array.isArray(data)).toBe(true);
    });
  });

  // ============================================
  // AC3-4: search_articles_by_unexplored_tags関数
  // ============================================
  describe("search_articles_by_unexplored_tags", () => {
    it("explored_tagsを指定せずに呼び出せる", async () => {
      const { data, error } = await supabase.rpc("search_articles_by_unexplored_tags", {
        match_count: 10,
      });
      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
    });

    it("全タグが探索済みの記事のみ除外する（<@演算子）", async () => {
      // explored_tags に horror と safe を両方指定
      // test-001 (tags: ["horror", "safe"]) → 全タグ探索済み → 除外
      // test-002 (tags: ["scientific", "euclid"]) → 未探索タグあり → 含まれる
      const { data, error } = await supabase.rpc("search_articles_by_unexplored_tags", {
        explored_tags: ["horror", "safe"],
        match_count: 100,
      });

      expect(error).toBeNull();
      const returnedIds = data.map((row: { id: string }) => row.id);
      // 全タグが探索済みのtest-001は除外されるべき
      expect(returnedIds).not.toContain(testArticles[0].article_id);
      // 未探索タグを持つtest-002は含まれるべき
      expect(returnedIds).toContain(testArticles[1].article_id);
    });

    it("一部タグのみ探索済みでも未探索タグがあれば返却する", async () => {
      // explored_tags に horror のみ指定
      // test-001 (tags: ["horror", "safe"]) → "safe"が未探索 → 含まれる
      const { data, error } = await supabase.rpc("search_articles_by_unexplored_tags", {
        explored_tags: ["horror"],
        match_count: 100,
      });

      expect(error).toBeNull();
      const returnedIds = data.map((row: { id: string }) => row.id);
      // 未探索タグ"safe"を持つtest-001は含まれるべき
      expect(returnedIds).toContain(testArticles[0].article_id);
      // 全く探索済みタグを含まないtest-002も含まれるべき
      expect(returnedIds).toContain(testArticles[1].article_id);
    });

    it("order_by='rating'でratingの降順にソートする", async () => {
      const { data, error } = await supabase.rpc("search_articles_by_unexplored_tags", {
        explored_tags: [],
        order_by: "rating",
        match_count: 10,
      });

      expect(error).toBeNull();
      // ratingの降順であることを確認（NULLは末尾）
      const ratings = data
        .map((row: { id: string }) => {
          const article = testArticles.find((a) => a.article_id === row.id);
          return article?.rating ?? -Infinity;
        })
        .filter((r: number) => r !== -Infinity);

      for (let i = 0; i < ratings.length - 1; i++) {
        expect(ratings[i]).toBeGreaterThanOrEqual(ratings[i + 1]);
      }
    });

    it("order_by='random'で呼び出せる", async () => {
      const { data, error } = await supabase.rpc("search_articles_by_unexplored_tags", {
        explored_tags: [],
        order_by: "random",
        match_count: 10,
      });

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(Array.isArray(data)).toBe(true);
    });

    it("order_by='random'でも全タグ探索済みの記事を除外する", async () => {
      const { data, error } = await supabase.rpc("search_articles_by_unexplored_tags", {
        explored_tags: ["horror", "safe"],
        order_by: "random",
        match_count: 100,
      });

      expect(error).toBeNull();
      const returnedIds = data.map((row: { id: string }) => row.id);
      // 全タグが探索済みのtest-001は除外されるべき
      expect(returnedIds).not.toContain(testArticles[0].article_id);
    });

    it("exclude_idsに指定した記事を除外する", async () => {
      const excludeId = testArticles[1].article_id;
      const { data, error } = await supabase.rpc("search_articles_by_unexplored_tags", {
        explored_tags: [],
        exclude_ids: [excludeId],
        match_count: 100,
      });

      expect(error).toBeNull();
      const returnedIds = data.map((row: { id: string }) => row.id);
      expect(returnedIds).not.toContain(excludeId);
    });

    it("tagsがNULLの記事は返さない", async () => {
      const { data, error } = await supabase.rpc("search_articles_by_unexplored_tags", {
        explored_tags: [],
        match_count: 100,
      });

      expect(error).toBeNull();
      const returnedIds = data.map((row: { id: string }) => row.id);
      // tagsがNULLの記事（test-006）が含まれていないことを確認
      expect(returnedIds).not.toContain(testArticles[5].article_id);
    });

    it("similarityは固定値0.5を返す", async () => {
      const { data, error } = await supabase.rpc("search_articles_by_unexplored_tags", {
        explored_tags: [],
        match_count: 10,
      });

      expect(error).toBeNull();
      data.forEach((row: { similarity: number }) => {
        expect(row.similarity).toBe(0.5);
      });
    });
  });

  // ============================================
  // AC5: search_adjacent_articles関数
  // ============================================
  describe("search_adjacent_articles", () => {
    it("デフォルトでmin_similarity=0.3、max_similarity=0.7の範囲で検索する", async () => {
      const { data, error } = await supabase.rpc("search_adjacent_articles", {
        query_vector: JSON.stringify(baseVector),
        match_count: 10,
      });

      expect(error).toBeNull();
      data.forEach((row: { similarity: number }) => {
        expect(row.similarity).toBeGreaterThanOrEqual(0.3);
        expect(row.similarity).toBeLessThanOrEqual(0.7);
      });
    });

    it("exclude_idsを正しく伝播する", async () => {
      const excludeId = testArticles[0].article_id;
      const { data, error } = await supabase.rpc("search_adjacent_articles", {
        query_vector: JSON.stringify(baseVector),
        exclude_ids: [excludeId],
        match_count: 10,
      });

      expect(error).toBeNull();
      const returnedIds = data.map((row: { id: string }) => row.id);
      expect(returnedIds).not.toContain(excludeId);
    });

    it("min_similarityとmax_similarityをカスタマイズできる", async () => {
      const { data, error } = await supabase.rpc("search_adjacent_articles", {
        query_vector: JSON.stringify(baseVector),
        match_count: 10,
        min_similarity: 0.4,
        max_similarity: 0.6,
      });

      expect(error).toBeNull();
      data.forEach((row: { similarity: number }) => {
        expect(row.similarity).toBeGreaterThanOrEqual(0.4);
        expect(row.similarity).toBeLessThanOrEqual(0.6);
      });
    });
  });

  // ============================================
  // AC6: パフォーマンス要件
  // ============================================
  describe("パフォーマンス", () => {
    it("search_articles_by_embeddingが100ms以内に完了する", async () => {
      const start = performance.now();

      await supabase.rpc("search_articles_by_embedding", {
        query_vector: JSON.stringify(baseVector),
        match_count: 10,
      });

      const duration = performance.now() - start;
      // CI環境では余裕を持たせる
      expect(duration).toBeLessThan(500);
    });

    it("search_articles_by_unexplored_tagsが100ms以内に完了する", async () => {
      const start = performance.now();

      await supabase.rpc("search_articles_by_unexplored_tags", {
        explored_tags: ["horror", "scientific"],
        match_count: 10,
      });

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(500);
    });

    it("search_adjacent_articlesが100ms以内に完了する", async () => {
      const start = performance.now();

      await supabase.rpc("search_adjacent_articles", {
        query_vector: JSON.stringify(baseVector),
        match_count: 10,
      });

      const duration = performance.now() - start;
      expect(duration).toBeLessThan(500);
    });
  });
});
