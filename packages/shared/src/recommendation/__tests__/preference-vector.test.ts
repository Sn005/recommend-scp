/**
 * @file 嗜好ベクトル計算テスト
 * @description ユーザーの行動履歴から嗜好ベクトルを計算するロジックのテスト
 * @see specs/004-recommend/004-01-recommend-foundation/004-01-05.md
 */

import { describe, it, expect } from "vitest";
import {
  calculatePreferenceVector,
  computeWeightedAverage,
  DEFAULT_SIGNAL_WEIGHTS,
  type PreferenceVectorInput,
  type SignalWeights,
} from "../preference-vector";

/**
 * モックEmbeddingベクトルを生成
 * @param dimension ベクトル次元（デフォルト: 1536）
 * @param values 初期値パターン（省略時は全て0）
 */
function createMockEmbedding(dimension = 1536, values: number[] = []): number[] {
  const result = new Array(dimension).fill(0);
  values.forEach((v, i) => {
    if (i < dimension) result[i] = v;
  });
  return result;
}

describe("calculatePreferenceVector", () => {
  describe("AC1: WHEN 嗜好ベクトルを計算する際 GIVEN ユーザーにLike/お気に入り/読了履歴がある場合", () => {
    it("お気に入り記事のみの場合、そのEmbeddingがそのまま嗜好ベクトルになる", async () => {
      // Arrange
      const input: PreferenceVectorInput = {
        favoriteArticleIds: ["scp-001"],
        likedArticleIds: [],
        viewedArticleIds: [],
        dislikedArticleIds: [],
      };
      const mockEmbedding = createMockEmbedding(1536, [1.0, 0.5, 0.25]);
      const getEmbedding = async (id: string) => (id === "scp-001" ? mockEmbedding : null);

      // Act
      const result = await calculatePreferenceVector(input, getEmbedding);

      // Assert: 1件のみなので正規化後も同じベクトル
      expect(result).not.toBeNull();
      expect(result).toHaveLength(1536);
      expect(result![0]).toBeCloseTo(1.0, 5);
      expect(result![1]).toBeCloseTo(0.5, 5);
      expect(result![2]).toBeCloseTo(0.25, 5);
    });

    it("結果は1536次元のベクトルとなる", async () => {
      // Arrange
      const input: PreferenceVectorInput = {
        favoriteArticleIds: ["scp-001"],
        likedArticleIds: [],
        viewedArticleIds: [],
        dislikedArticleIds: [],
      };

      // Act
      const result = await calculatePreferenceVector(input, async () =>
        createMockEmbedding(1536, [1.0])
      );

      // Assert
      expect(result).toHaveLength(1536);
    });

    it("Like + 読了の混合で正しく重み付け平均が計算される", async () => {
      // Arrange: Like(重み1.0) + 読了(重み0.3)
      const input: PreferenceVectorInput = {
        favoriteArticleIds: [],
        likedArticleIds: ["scp-001"],
        viewedArticleIds: ["scp-002"],
        dislikedArticleIds: [],
      };
      // scp-001: [1, 0], scp-002: [0, 1]
      const embeddings: Record<string, number[]> = {
        "scp-001": [1.0, 0.0],
        "scp-002": [0.0, 1.0],
      };
      const getEmbedding = async (id: string) => embeddings[id] ?? null;

      // Act
      const result = await calculatePreferenceVector(input, getEmbedding);

      // Assert
      // 重み付け平均: ([1,0]*1.0 + [0,1]*0.3) / (1.0 + 0.3) = [1.0, 0.3] / 1.3
      // = [0.769..., 0.230...]
      expect(result).not.toBeNull();
      expect(result).toHaveLength(2);
      expect(result![0]).toBeCloseTo(1.0 / 1.3, 3);
      expect(result![1]).toBeCloseTo(0.3 / 1.3, 3);
    });

    it("お気に入り + Like + 読了の全シグナルで正しく計算される", async () => {
      // Arrange
      const input: PreferenceVectorInput = {
        favoriteArticleIds: ["scp-001"], // [1, 0, 0] 重み2.0
        likedArticleIds: ["scp-002"], // [0, 1, 0] 重み1.0
        viewedArticleIds: ["scp-003"], // [0, 0, 1] 重み0.3
        dislikedArticleIds: [],
      };
      const embeddings: Record<string, number[]> = {
        "scp-001": [1.0, 0.0, 0.0],
        "scp-002": [0.0, 1.0, 0.0],
        "scp-003": [0.0, 0.0, 1.0],
      };
      const getEmbedding = async (id: string) => embeddings[id] ?? null;

      // Act
      const result = await calculatePreferenceVector(input, getEmbedding);

      // Assert
      // 重み付け平均: ([1,0,0]*2.0 + [0,1,0]*1.0 + [0,0,1]*0.3) / (2.0 + 1.0 + 0.3)
      // = [2.0, 1.0, 0.3] / 3.3
      const totalWeight = 2.0 + 1.0 + 0.3;
      expect(result).not.toBeNull();
      expect(result![0]).toBeCloseTo(2.0 / totalWeight, 3);
      expect(result![1]).toBeCloseTo(1.0 / totalWeight, 3);
      expect(result![2]).toBeCloseTo(0.3 / totalWeight, 3);
    });
  });

  describe("AC2: WHEN 重み付け平均を計算する際 THEN シグナル別重みを適用する", () => {
    it("デフォルト重みが正しく設定されている", () => {
      // Assert
      expect(DEFAULT_SIGNAL_WEIGHTS.favorite).toBe(2.0);
      expect(DEFAULT_SIGNAL_WEIGHTS.like).toBe(1.0);
      expect(DEFAULT_SIGNAL_WEIGHTS.view).toBe(0.3);
      expect(DEFAULT_SIGNAL_WEIGHTS.dislike).toBe(-0.5);
    });

    it("お気に入り（2.0）はLike（1.0）より強い影響を持つ", async () => {
      // Arrange: お気に入り1件 + Like1件で同じベクトル方向
      const input: PreferenceVectorInput = {
        favoriteArticleIds: ["scp-001"], // 重み2.0
        likedArticleIds: ["scp-002"], // 重み1.0
        viewedArticleIds: [],
        dislikedArticleIds: [],
      };
      // 両方異なる方向
      const embeddings: Record<string, number[]> = {
        "scp-001": [1.0, 0.0], // お気に入り
        "scp-002": [0.0, 1.0], // Like
      };
      const getEmbedding = async (id: string) => embeddings[id] ?? null;

      // Act
      const result = await calculatePreferenceVector(input, getEmbedding);

      // Assert: お気に入り方向([1,0])により強く偏る
      // [1,0]*2.0 + [0,1]*1.0 = [2.0, 1.0] / 3.0 = [0.667, 0.333]
      expect(result).not.toBeNull();
      expect(result![0]).toBeCloseTo(2.0 / 3.0, 3);
      expect(result![1]).toBeCloseTo(1.0 / 3.0, 3);
    });

    it("カスタム重みを指定できる", async () => {
      // Arrange
      const input: PreferenceVectorInput = {
        favoriteArticleIds: ["scp-001"],
        likedArticleIds: ["scp-002"],
        viewedArticleIds: [],
        dislikedArticleIds: [],
      };
      const embeddings: Record<string, number[]> = {
        "scp-001": [1.0, 0.0],
        "scp-002": [0.0, 1.0],
      };
      const customWeights: Partial<SignalWeights> = {
        favorite: 1.0, // デフォルト2.0を1.0に変更
        like: 1.0,
      };

      // Act
      const result = await calculatePreferenceVector(
        input,
        async (id) => embeddings[id] ?? null,
        customWeights
      );

      // Assert: 同じ重みなので均等配分
      expect(result).not.toBeNull();
      expect(result![0]).toBeCloseTo(0.5, 3);
      expect(result![1]).toBeCloseTo(0.5, 3);
    });
  });

  describe("AC3: WHEN ユーザーにDislike履歴がある場合", () => {
    it("Dislike記事が負の重み（-0.5）で減算される", async () => {
      // Arrange: Like 1件 + Dislike 1件（同じ方向）
      const input: PreferenceVectorInput = {
        favoriteArticleIds: [],
        likedArticleIds: ["scp-001"], // [1, 0] 重み1.0
        viewedArticleIds: [],
        dislikedArticleIds: ["scp-002"], // [1, 0] 重み-0.5
      };
      const embeddings: Record<string, number[]> = {
        "scp-001": [1.0, 0.0],
        "scp-002": [1.0, 0.0], // 同じ方向
      };
      const getEmbedding = async (id: string) => embeddings[id] ?? null;

      // Act
      const result = await calculatePreferenceVector(input, getEmbedding);

      // Assert
      // ([1,0]*1.0 + [1,0]*(-0.5)) / (|1.0| + |-0.5|) = [0.5, 0] / 1.5 = [0.333, 0]
      expect(result).not.toBeNull();
      expect(result![0]).toBeCloseTo(0.5 / 1.5, 3);
      expect(result![1]).toBe(0);
    });

    it("Likeと反対方向のDislikeで「避けるべき方向」が反映される", async () => {
      // Arrange
      const input: PreferenceVectorInput = {
        favoriteArticleIds: [],
        likedArticleIds: ["scp-001"], // [1, 0]
        viewedArticleIds: [],
        dislikedArticleIds: ["scp-002"], // [0, 1] 直交方向
      };
      const embeddings: Record<string, number[]> = {
        "scp-001": [1.0, 0.0],
        "scp-002": [0.0, 1.0],
      };
      const getEmbedding = async (id: string) => embeddings[id] ?? null;

      // Act
      const result = await calculatePreferenceVector(input, getEmbedding);

      // Assert
      // ([1,0]*1.0 + [0,1]*(-0.5)) / (1.0 + 0.5) = [1, -0.5] / 1.5
      expect(result).not.toBeNull();
      expect(result![0]).toBeCloseTo(1.0 / 1.5, 3);
      expect(result![1]).toBeCloseTo(-0.5 / 1.5, 3);
    });

    it("Dislikeのみの場合でもベクトルが生成される（負の方向）", async () => {
      // Arrange
      const input: PreferenceVectorInput = {
        favoriteArticleIds: [],
        likedArticleIds: [],
        viewedArticleIds: [],
        dislikedArticleIds: ["scp-001"],
      };

      // Act
      const result = await calculatePreferenceVector(input, async () => [1.0, 0.0]);

      // Assert: 負の重みのみでも計算される
      // [1,0]*(-0.5) / 0.5 = [-1, 0]
      expect(result).not.toBeNull();
      expect(result).toHaveLength(2);
      expect(result![0]).toBe(-1.0);
      expect(result![1]).toBe(0);
    });
  });

  describe("AC4: WHEN 嗜好ベクトルを計算する際 GIVEN 履歴が空の場合", () => {
    it("全ての入力配列が空の場合、nullを返す", async () => {
      // Arrange
      const input: PreferenceVectorInput = {
        favoriteArticleIds: [],
        likedArticleIds: [],
        viewedArticleIds: [],
        dislikedArticleIds: [],
      };

      // Act
      const result = await calculatePreferenceVector(input, async () => [1.0, 0.0]);

      // Assert
      expect(result).toBeNull();
    });

    it("記事のEmbeddingが取得できない場合、その記事はスキップされる", async () => {
      // Arrange
      const input: PreferenceVectorInput = {
        favoriteArticleIds: ["scp-001", "scp-999"], // scp-999は存在しない
        likedArticleIds: [],
        viewedArticleIds: [],
        dislikedArticleIds: [],
      };
      const embeddings: Record<string, number[]> = {
        "scp-001": [1.0, 0.0],
        // scp-999 は null
      };
      const getEmbedding = async (id: string) => embeddings[id] ?? null;

      // Act
      const result = await calculatePreferenceVector(input, getEmbedding);

      // Assert: scp-001のみで計算される
      expect(result).not.toBeNull();
      expect(result).toEqual([1.0, 0.0]);
    });

    it("全記事のEmbeddingが取得できない場合、nullが返る", async () => {
      // Arrange
      const input: PreferenceVectorInput = {
        favoriteArticleIds: ["scp-001", "scp-002"],
        likedArticleIds: [],
        viewedArticleIds: [],
        dislikedArticleIds: [],
      };
      const getEmbedding = async () => null; // 常にnull

      // Act
      const result = await calculatePreferenceVector(input, getEmbedding);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe("エッジケース", () => {
    it("同じ記事IDが複数カテゴリに存在する場合、それぞれ独立して計算される", async () => {
      // Arrange: 同じ記事がお気に入りとLikeの両方にある
      const input: PreferenceVectorInput = {
        favoriteArticleIds: ["scp-001"], // 重み2.0
        likedArticleIds: ["scp-001"], // 重み1.0
        viewedArticleIds: [],
        dislikedArticleIds: [],
      };
      const getEmbedding = async () => [1.0, 0.0];

      // Act
      const result = await calculatePreferenceVector(input, getEmbedding);

      // Assert: 両方カウントされる（2.0 + 1.0 = 3.0）
      // [1,0]*2.0 + [1,0]*1.0 = [3.0, 0] / 3.0 = [1.0, 0]
      expect(result).not.toBeNull();
      expect(result![0]).toBeCloseTo(1.0, 3);
    });

    it("getEmbeddingがエラーをスローした場合、その記事はスキップされる", async () => {
      // Arrange
      const input: PreferenceVectorInput = {
        favoriteArticleIds: ["scp-001", "scp-error"],
        likedArticleIds: [],
        viewedArticleIds: [],
        dislikedArticleIds: [],
      };
      const getEmbedding = async (id: string) => {
        if (id === "scp-error") throw new Error("Network error");
        return [1.0, 0.0];
      };

      // Act
      const result = await calculatePreferenceVector(input, getEmbedding);

      // Assert: scp-001のみで計算される
      expect(result).not.toBeNull();
      expect(result).toEqual([1.0, 0.0]);
    });

    it("非常に大量の記事でも計算できる", async () => {
      // Arrange: 1000件のお気に入り
      const articleIds = Array.from({ length: 1000 }, (_, i) => `scp-${i}`);
      const input: PreferenceVectorInput = {
        favoriteArticleIds: articleIds,
        likedArticleIds: [],
        viewedArticleIds: [],
        dislikedArticleIds: [],
      };
      const getEmbedding = async () => createMockEmbedding(1536, [1.0]);

      // Act
      const startTime = Date.now();
      const result = await calculatePreferenceVector(input, getEmbedding);
      const elapsed = Date.now() - startTime;

      // Assert
      expect(result).not.toBeNull();
      expect(result).toHaveLength(1536);
      // パフォーマンス: 1秒以内に完了
      expect(elapsed).toBeLessThan(1000);
    });
  });
});

describe("computeWeightedAverage", () => {
  it("単一ベクトルの場合、そのベクトルを返す", () => {
    // Arrange
    const items = [{ vector: [1.0, 0.5, 0.25], weight: 2.0 }];

    // Act
    const result = computeWeightedAverage(items);

    // Assert
    expect(result).toEqual([1.0, 0.5, 0.25]);
  });

  it("同じ重みの複数ベクトルは単純平均になる", () => {
    // Arrange
    const items = [
      { vector: [1.0, 0.0], weight: 1.0 },
      { vector: [0.0, 1.0], weight: 1.0 },
    ];

    // Act
    const result = computeWeightedAverage(items);

    // Assert
    expect(result[0]).toBeCloseTo(0.5, 5);
    expect(result[1]).toBeCloseTo(0.5, 5);
  });

  it("負の重みが正しく処理される", () => {
    // Arrange
    const items = [
      { vector: [1.0, 0.0], weight: 1.0 },
      { vector: [1.0, 0.0], weight: -0.5 },
    ];

    // Act
    const result = computeWeightedAverage(items);

    // Assert
    // (1*1.0 + 1*(-0.5)) / (1.0 + 0.5) = 0.5 / 1.5 = 0.333
    expect(result[0]).toBeCloseTo(0.5 / 1.5, 5);
  });

  it("空配列の場合は空配列を返す", () => {
    // Act
    const result = computeWeightedAverage([]);

    // Assert
    expect(result).toEqual([]);
  });
});
