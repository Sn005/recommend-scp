/**
 * @file ストレージ抽象化レイヤー型定義テスト
 * @description Subtask 004-01-01 のACを検証するテスト
 */

import { describe, it, expect, expectTypeOf } from "vitest";
import type {
  PreferenceStorage,
  StarterPackType,
  PreferenceProfile,
  ViewHistory,
  Feedback,
  RecommendationLog,
} from "./types";

describe("004-01-01: ストレージ抽象化レイヤー", () => {
  describe("AC1: PreferenceStorageインターフェース", () => {
    it("インターフェースが正しくエクスポートされる", () => {
      expectTypeOf<PreferenceStorage>().toMatchTypeOf<object>();
    });

    it("モック実装が型制約を満たす", () => {
      const mockStorage: PreferenceStorage = {
        getProfile: async (_visitorId: string) => null,
        saveProfile: async (_profile) => {},
        getViewHistory: async (_visitorId, _limit?) => [],
        addViewHistory: async (_history) => {},
        getFeedback: async (_visitorId) => [],
        getFeedbackByArticle: async (_visitorId, _articleId) => null,
        addFeedback: async (_feedback) => {},
        getRecommendationLog: async (_visitorId, _limit?) => [],
        addRecommendationLog: async (_log) => {},
        getDislikedArticleIds: async (_visitorId) => [],
        getArticleTags: async (_articleId) => null,
        getFavorites: async (_visitorId) => [],
        addFavorite: async (_favorite) => {},
        removeFavorite: async (_visitorId, _articleId) => {},
      };

      expect(mockStorage).toBeDefined();
    });
  });

  describe("AC2: 必須メソッドの提供", () => {
    it("嗜好プロファイル操作メソッドを持つ", () => {
      expectTypeOf<PreferenceStorage>().toHaveProperty("getProfile");
      expectTypeOf<PreferenceStorage>().toHaveProperty("saveProfile");
    });

    it("閲覧履歴操作メソッドを持つ", () => {
      expectTypeOf<PreferenceStorage>().toHaveProperty("getViewHistory");
      expectTypeOf<PreferenceStorage>().toHaveProperty("addViewHistory");
    });

    it("フィードバック操作メソッドを持つ", () => {
      expectTypeOf<PreferenceStorage>().toHaveProperty("getFeedback");
      expectTypeOf<PreferenceStorage>().toHaveProperty("getFeedbackByArticle");
      expectTypeOf<PreferenceStorage>().toHaveProperty("addFeedback");
    });

    it("推薦ログ操作メソッドを持つ", () => {
      expectTypeOf<PreferenceStorage>().toHaveProperty("getRecommendationLog");
      expectTypeOf<PreferenceStorage>().toHaveProperty("addRecommendationLog");
    });

    it("Dislike記事取得メソッドを持つ", () => {
      expectTypeOf<PreferenceStorage>().toHaveProperty("getDislikedArticleIds");
    });

    it("getProfile は visitorId を受け取り PreferenceProfile | null を返す", () => {
      type GetProfileFn = PreferenceStorage["getProfile"];
      expectTypeOf<GetProfileFn>().parameters.toMatchTypeOf<[string]>();
      expectTypeOf<GetProfileFn>().returns.resolves.toMatchTypeOf<PreferenceProfile | null>();
    });

    it("saveProfile は PreferenceProfile を受け取り void を返す", () => {
      type SaveProfileFn = PreferenceStorage["saveProfile"];
      expectTypeOf<SaveProfileFn>().parameters.toMatchTypeOf<[PreferenceProfile]>();
      expectTypeOf<SaveProfileFn>().returns.resolves.toBeVoid();
    });

    it("getViewHistory は visitorId と オプショナルlimit を受け取る", () => {
      type GetViewHistoryFn = PreferenceStorage["getViewHistory"];
      expectTypeOf<GetViewHistoryFn>().parameters.toMatchTypeOf<[string, number?]>();
      expectTypeOf<GetViewHistoryFn>().returns.resolves.toMatchTypeOf<ViewHistory[]>();
    });

    it("getFeedbackByArticle は visitorId と articleId を受け取る", () => {
      type GetFeedbackByArticleFn = PreferenceStorage["getFeedbackByArticle"];
      expectTypeOf<GetFeedbackByArticleFn>().parameters.toMatchTypeOf<[string, string]>();
      expectTypeOf<GetFeedbackByArticleFn>().returns.resolves.toMatchTypeOf<Feedback | null>();
    });

    it("getDislikedArticleIds は visitorId を受け取り string[] を返す", () => {
      type GetDislikedFn = PreferenceStorage["getDislikedArticleIds"];
      expectTypeOf<GetDislikedFn>().parameters.toMatchTypeOf<[string]>();
      expectTypeOf<GetDislikedFn>().returns.resolves.toMatchTypeOf<string[]>();
    });
  });

  describe("AC3: 型定義のインポート可能性", () => {
    it("PreferenceStorage をインポート可能", () => {
      expectTypeOf<PreferenceStorage>().not.toBeNever();
    });

    it("StarterPackType をインポート可能", () => {
      expectTypeOf<StarterPackType>().toMatchTypeOf<string>();
    });

    it("PreferenceProfile をインポート可能", () => {
      expectTypeOf<PreferenceProfile>().toMatchTypeOf<object>();
    });

    it("ViewHistory をインポート可能", () => {
      expectTypeOf<ViewHistory>().toMatchTypeOf<object>();
    });

    it("Feedback をインポート可能", () => {
      expectTypeOf<Feedback>().toMatchTypeOf<object>();
    });

    it("RecommendationLog をインポート可能", () => {
      expectTypeOf<RecommendationLog>().toMatchTypeOf<object>();
    });
  });

  describe("StarterPackType 型", () => {
    it("6種類のバリアントを含む", () => {
      const types: StarterPackType[] = [
        "horror",
        "surreal",
        "scientific",
        "heartwarming",
        "mystery",
        "custom",
      ];

      expect(types).toHaveLength(6);
      types.forEach((type) => {
        expectTypeOf(type).toMatchTypeOf<StarterPackType>();
      });
    });
  });

  describe("PreferenceProfile 型", () => {
    it("必須プロパティを持つ", () => {
      const profile: PreferenceProfile = {
        visitorId: "visitor-123",
        tagWeights: { ホラー: 0.8 },
        objectClassPreference: { Safe: 0.5 },
        createdAt: "2026-01-20T00:00:00Z",
        updatedAt: "2026-01-20T00:00:00Z",
      };

      expect(profile.visitorId).toBe("visitor-123");
      expect(profile.tagWeights).toEqual({ ホラー: 0.8 });
    });

    it("オプショナルプロパティを省略可能", () => {
      const profile: PreferenceProfile = {
        visitorId: "visitor-123",
        tagWeights: {},
        objectClassPreference: {},
        createdAt: "2026-01-20T00:00:00Z",
        updatedAt: "2026-01-20T00:00:00Z",
      };

      expect(profile.starterPack).toBeUndefined();
      expect(profile.onboardingCompletedAt).toBeUndefined();
      expect(profile.preferenceEmbedding).toBeUndefined();
    });

    it("preferenceEmbedding は number[] 型", () => {
      const profile: PreferenceProfile = {
        visitorId: "visitor-123",
        tagWeights: {},
        objectClassPreference: {},
        preferenceEmbedding: [0.1, 0.2, 0.3],
        createdAt: "2026-01-20T00:00:00Z",
        updatedAt: "2026-01-20T00:00:00Z",
      };

      expectTypeOf(profile.preferenceEmbedding).toMatchTypeOf<number[] | undefined>();
    });
  });

  describe("ViewHistory 型", () => {
    it("必須プロパティを持つ", () => {
      const history: ViewHistory = {
        id: "visitor-123_SCP-173_1737331200000",
        visitorId: "visitor-123",
        articleId: "SCP-173",
        viewedAt: "2026-01-20T00:00:00Z",
      };

      expect(history.id).toContain(history.visitorId);
      expect(history.id).toContain(history.articleId);
    });

    it("duration はオプショナル", () => {
      const history: ViewHistory = {
        id: "visitor-123_SCP-173_1737331200000",
        visitorId: "visitor-123",
        articleId: "SCP-173",
        viewedAt: "2026-01-20T00:00:00Z",
      };

      expect(history.duration).toBeUndefined();
    });
  });

  describe("Feedback 型", () => {
    it("type は 'like' または 'dislike' のみ", () => {
      const like: Feedback = {
        id: "visitor-123_SCP-173",
        visitorId: "visitor-123",
        articleId: "SCP-173",
        type: "like",
        createdAt: "2026-01-20T00:00:00Z",
      };

      const dislike: Feedback = {
        id: "visitor-123_SCP-999",
        visitorId: "visitor-123",
        articleId: "SCP-999",
        type: "dislike",
        createdAt: "2026-01-20T00:00:00Z",
      };

      expectTypeOf(like.type).toEqualTypeOf<"like" | "dislike">();
      expectTypeOf(dislike.type).toEqualTypeOf<"like" | "dislike">();
    });
  });

  describe("RecommendationLog 型", () => {
    it("source は 'preference' または 'serendipity'", () => {
      const preference: RecommendationLog = {
        id: "log-1",
        visitorId: "visitor-123",
        articleId: "SCP-173",
        recommendedAt: "2026-01-20T00:00:00Z",
        source: "preference",
        clicked: true,
      };

      const serendipity: RecommendationLog = {
        id: "log-2",
        visitorId: "visitor-123",
        articleId: "SCP-999",
        recommendedAt: "2026-01-20T00:00:00Z",
        source: "serendipity",
        clicked: false,
      };

      expectTypeOf(preference.source).toEqualTypeOf<"preference" | "serendipity">();
      expectTypeOf(serendipity.source).toEqualTypeOf<"preference" | "serendipity">();
    });

    it("clicked は boolean", () => {
      const log: RecommendationLog = {
        id: "log-1",
        visitorId: "visitor-123",
        articleId: "SCP-173",
        recommendedAt: "2026-01-20T00:00:00Z",
        source: "preference",
        clicked: false,
      };

      expectTypeOf(log.clicked).toBeBoolean();
    });
  });
});
