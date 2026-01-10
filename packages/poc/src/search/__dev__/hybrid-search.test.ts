/**
 * Hybrid Search Tests
 * TDD: Red -> Green -> Refactor
 */

import { describe, it, expect, vi, beforeEach, Mock } from "vitest";
import {
  hybridSearch,
  calculateTagScore,
  jaccardSimilarity,
  HybridSearchParams,
} from "../hybrid-search";
import { getSupabaseAdmin } from "../../lib/supabase";
import { vectorSearch } from "../vector-search";

// モック
vi.mock("../../lib/supabase", () => ({
  getSupabaseAdmin: vi.fn(),
}));

vi.mock("../vector-search", () => ({
  vectorSearch: vi.fn(),
}));

// モックデータ
const mockVectorResults = {
  queryId: "SCP-173",
  queryTitle: "SCP-173 - The Sculpture",
  results: [
    { articleId: "SCP-096", title: "SCP-096 - The Shy Guy", similarityScore: 0.92 },
    { articleId: "SCP-106", title: "SCP-106 - The Old Man", similarityScore: 0.88 },
    { articleId: "SCP-087", title: "SCP-087 - The Stairwell", similarityScore: 0.85 },
    { articleId: "SCP-049", title: "SCP-049 - Plague Doctor", similarityScore: 0.82 },
    { articleId: "SCP-682", title: "SCP-682 - Hard-to-Destroy Reptile", similarityScore: 0.79 },
  ],
  searchTimeMs: 50,
};

const mockQueryTags = {
  object_class: "Euclid",
  genre: ["horror"],
  theme: ["cognition", "biological"],
  format: "standard",
};

const mockTargetTags: Record<string, typeof mockQueryTags> = {
  "SCP-096": {
    object_class: "Euclid",
    genre: ["horror"],
    theme: ["cognition"],
    format: "standard",
  },
  "SCP-106": {
    object_class: "Keter",
    genre: ["horror"],
    theme: ["extradimensional"],
    format: "standard",
  },
  "SCP-087": {
    object_class: "Euclid",
    genre: ["horror", "sci-fi"],
    theme: ["extradimensional"],
    format: "exploration-log",
  },
  "SCP-049": {
    object_class: "Euclid",
    genre: ["horror"],
    theme: ["biological"],
    format: "interview",
  },
  "SCP-682": {
    object_class: "Keter",
    genre: ["horror", "sci-fi"],
    theme: ["biological", "reality-bending"],
    format: "standard",
  },
};

describe("jaccardSimilarity", () => {
  it("同じ配列で1.0を返す", () => {
    expect(jaccardSimilarity(["a", "b"], ["a", "b"])).toBe(1);
  });

  it("完全に異なる配列で0を返す", () => {
    expect(jaccardSimilarity(["a", "b"], ["c", "d"])).toBe(0);
  });

  it("部分的に一致する配列で正しい値を返す", () => {
    // 共通: 1, 和集合: 3, 結果: 1/3
    expect(jaccardSimilarity(["a", "b"], ["a", "c"])).toBeCloseTo(1 / 3);
  });

  it("空の配列で0を返す", () => {
    expect(jaccardSimilarity([], [])).toBe(0);
  });

  it("片方が空の配列で0を返す", () => {
    expect(jaccardSimilarity(["a"], [])).toBe(0);
    expect(jaccardSimilarity([], ["a"])).toBe(0);
  });
});

describe("calculateTagScore", () => {
  it("完全一致で1.0を返す", () => {
    const tags = {
      object_class: "Euclid",
      genre: ["horror"],
      theme: ["cognition"],
      format: "standard",
    };
    expect(calculateTagScore(tags, tags)).toBe(1);
  });

  it("完全不一致で0を返す", () => {
    const query = {
      object_class: "Safe",
      genre: ["comedy"],
      theme: ["temporal"],
      format: "tale",
    };
    const target = {
      object_class: "Keter",
      genre: ["horror"],
      theme: ["biological"],
      format: "standard",
    };
    expect(calculateTagScore(query, target)).toBe(0);
  });

  it("部分一致で正しいスコアを返す", () => {
    const query = {
      object_class: "Euclid",
      genre: ["horror", "sci-fi"],
      theme: ["cognition", "biological"],
      format: "standard",
    };
    const target = {
      object_class: "Euclid", // 1.0
      genre: ["horror"], // jaccard: 1/2 = 0.5
      theme: ["biological", "temporal"], // jaccard: 1/3 ≈ 0.333
      format: "interview", // 0.0
    };
    // 平均: (1.0 + 0.5 + 0.333 + 0.0) / 4 ≈ 0.458
    const score = calculateTagScore(query, target);
    expect(score).toBeGreaterThan(0.4);
    expect(score).toBeLessThan(0.5);
  });
});

describe("hybridSearch", () => {
  let mockFrom: Mock;

  beforeEach(() => {
    vi.clearAllMocks();

    // vectorSearchのモック
    (vectorSearch as Mock).mockResolvedValue(mockVectorResults);

    // タグ取得のモック
    mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === "article_tags") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockImplementation((field: string, value: string) => {
            const tags = value === "SCP-173" ? mockQueryTags : mockTargetTags[value];
            if (!tags) {
              return { data: [], error: null };
            }
            // タグデータをarticle_tags形式で返す
            const tagData = [
              { tags: { category: "object_class", value: tags.object_class } },
              ...tags.genre.map((g: string) => ({ tags: { category: "genre", value: g } })),
              ...tags.theme.map((t: string) => ({ tags: { category: "theme", value: t } })),
              { tags: { category: "format", value: tags.format } },
            ];
            return { data: tagData, error: null };
          }),
        };
      }
      return { select: vi.fn().mockReturnThis(), eq: vi.fn() };
    });

    (getSupabaseAdmin as Mock).mockReturnValue({
      from: mockFrom,
    });
  });

  describe("基本機能", () => {
    it("ハイブリッド検索で結果が返される", async () => {
      const params: HybridSearchParams = {
        query_id: "SCP-173",
        embedding_weight: 0.7,
        tag_weight: 0.3,
        limit: 5,
      };

      const results = await hybridSearch(params);

      expect(results.length).toBeLessThanOrEqual(5);
      expect(vectorSearch).toHaveBeenCalledWith({
        queryId: "SCP-173",
        limit: 15, // limit * 3
      });
    });

    it("各結果に必要なプロパティが含まれる", async () => {
      const params: HybridSearchParams = {
        query_id: "SCP-173",
        embedding_weight: 0.7,
        tag_weight: 0.3,
        limit: 5,
      };

      const results = await hybridSearch(params);

      results.forEach((result) => {
        expect(result).toHaveProperty("id");
        expect(result).toHaveProperty("title");
        expect(result).toHaveProperty("similarity_score"); // final score
        expect(result).toHaveProperty("embedding_score");
        expect(result).toHaveProperty("tag_score");
        expect(result).toHaveProperty("matchedTags");
      });
    });
  });

  describe("重みパラメータ", () => {
    it("デフォルト重みが正しく適用される", async () => {
      const params: HybridSearchParams = {
        query_id: "SCP-173",
        embedding_weight: 0.7,
        tag_weight: 0.3,
        limit: 5,
      };

      const results = await hybridSearch(params);

      // スコアが重みに基づいて計算されていることを確認
      results.forEach((result) => {
        const expectedScore =
          0.7 * result.embedding_score + 0.3 * result.tag_score;
        expect(result.similarity_score).toBeCloseTo(expectedScore, 5);
      });
    });

    it("カスタム重みが正しく適用される", async () => {
      const params: HybridSearchParams = {
        query_id: "SCP-173",
        embedding_weight: 0.5,
        tag_weight: 0.5,
        limit: 5,
      };

      const results = await hybridSearch(params);

      results.forEach((result) => {
        const expectedScore =
          0.5 * result.embedding_score + 0.5 * result.tag_score;
        expect(result.similarity_score).toBeCloseTo(expectedScore, 5);
      });
    });
  });

  describe("スコアの妥当性", () => {
    it("tag_scoreが0-1の範囲である", async () => {
      const params: HybridSearchParams = {
        query_id: "SCP-173",
        embedding_weight: 0.7,
        tag_weight: 0.3,
        limit: 5,
      };

      const results = await hybridSearch(params);

      results.forEach((result) => {
        expect(result.tag_score).toBeGreaterThanOrEqual(0);
        expect(result.tag_score).toBeLessThanOrEqual(1);
      });
    });

    it("similarity_score（最終スコア）が0-1の範囲である", async () => {
      const params: HybridSearchParams = {
        query_id: "SCP-173",
        embedding_weight: 0.7,
        tag_weight: 0.3,
        limit: 5,
      };

      const results = await hybridSearch(params);

      results.forEach((result) => {
        expect(result.similarity_score).toBeGreaterThanOrEqual(0);
        expect(result.similarity_score).toBeLessThanOrEqual(1);
      });
    });

    it("結果が最終スコアの降順でソートされている", async () => {
      const params: HybridSearchParams = {
        query_id: "SCP-173",
        embedding_weight: 0.7,
        tag_weight: 0.3,
        limit: 5,
      };

      const results = await hybridSearch(params);

      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].similarity_score).toBeGreaterThanOrEqual(
          results[i].similarity_score
        );
      }
    });
  });

  describe("マッチしたタグ情報", () => {
    it("matchedTagsに一致情報が含まれる", async () => {
      const params: HybridSearchParams = {
        query_id: "SCP-173",
        embedding_weight: 0.7,
        tag_weight: 0.3,
        limit: 5,
      };

      const results = await hybridSearch(params);

      results.forEach((result) => {
        expect(result.matchedTags).toHaveProperty("object_class");
        expect(result.matchedTags).toHaveProperty("genre");
        expect(result.matchedTags).toHaveProperty("theme");
        expect(result.matchedTags).toHaveProperty("format");
        expect(typeof result.matchedTags.object_class).toBe("boolean");
        expect(Array.isArray(result.matchedTags.genre)).toBe(true);
        expect(Array.isArray(result.matchedTags.theme)).toBe(true);
        expect(typeof result.matchedTags.format).toBe("boolean");
      });
    });
  });
});
