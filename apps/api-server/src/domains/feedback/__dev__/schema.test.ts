/**
 * @file Feedback APIスキーマテスト
 * @description AC-9: API後方互換性のバリデーションテスト
 * @see specs/006-frontend/006-05-transition-ux/006-05-06.md
 */

import { describe, it, expect } from "vitest";
import { recordFeedbackSchema } from "../schema";

const VALID_VISITOR_ID = "550e8400-e29b-41d4-a716-446655440000";
const VALID_ARTICLE_ID = "scp-173";

describe("recordFeedbackSchema", () => {
  describe("AC-9: API後方互換性", () => {
    it("type=nextのリクエストが検証に通る", () => {
      const input = {
        visitorId: VALID_VISITOR_ID,
        articleId: VALID_ARTICLE_ID,
        type: "next",
      };

      const result = recordFeedbackSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("type=likeのリクエストが検証に通る（後方互換性）", () => {
      const input = {
        visitorId: VALID_VISITOR_ID,
        articleId: VALID_ARTICLE_ID,
        type: "like",
      };

      const result = recordFeedbackSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("type=nextのリクエストが検証に通る（like以外の有効な型）", () => {
      const input = {
        visitorId: VALID_VISITOR_ID,
        articleId: VALID_ARTICLE_ID,
        type: "next",
      };

      const result = recordFeedbackSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("metadataフィールドがオプショナルで受け付けられる", () => {
      const input = {
        visitorId: VALID_VISITOR_ID,
        articleId: VALID_ARTICLE_ID,
        type: "next",
        metadata: {
          scrollDepth: 30,
          dwellTime: 15,
          interestLevel: "medium",
        },
      };

      const result = recordFeedbackSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("metadataなしでも検証に通る", () => {
      const input = {
        visitorId: VALID_VISITOR_ID,
        articleId: VALID_ARTICLE_ID,
        type: "next",
      };

      const result = recordFeedbackSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it("metadataのscrollDepthが0-100の範囲で受け付けられる", () => {
      const input = {
        visitorId: VALID_VISITOR_ID,
        articleId: VALID_ARTICLE_ID,
        type: "next",
        metadata: {
          scrollDepth: 0,
          dwellTime: 0,
          interestLevel: "low",
        },
      };

      const result = recordFeedbackSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe("異常系", () => {
    it("無効なtypeで検証に失敗する", () => {
      const input = {
        visitorId: VALID_VISITOR_ID,
        articleId: VALID_ARTICLE_ID,
        type: "invalid",
      };

      const result = recordFeedbackSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("metadata.scrollDepthが負の値で検証に失敗する", () => {
      const input = {
        visitorId: VALID_VISITOR_ID,
        articleId: VALID_ARTICLE_ID,
        type: "next",
        metadata: {
          scrollDepth: -10,
          dwellTime: 15,
          interestLevel: "medium",
        },
      };

      const result = recordFeedbackSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("metadata.scrollDepthが100超で検証に失敗する", () => {
      const input = {
        visitorId: VALID_VISITOR_ID,
        articleId: VALID_ARTICLE_ID,
        type: "next",
        metadata: {
          scrollDepth: 150,
          dwellTime: 15,
          interestLevel: "medium",
        },
      };

      const result = recordFeedbackSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("metadata.dwellTimeが負の値で検証に失敗する", () => {
      const input = {
        visitorId: VALID_VISITOR_ID,
        articleId: VALID_ARTICLE_ID,
        type: "next",
        metadata: {
          scrollDepth: 30,
          dwellTime: -5,
          interestLevel: "medium",
        },
      };

      const result = recordFeedbackSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it("metadata.interestLevelが無効な値で検証に失敗する", () => {
      const input = {
        visitorId: VALID_VISITOR_ID,
        articleId: VALID_ARTICLE_ID,
        type: "next",
        metadata: {
          scrollDepth: 30,
          dwellTime: 15,
          interestLevel: "invalid",
        },
      };

      const result = recordFeedbackSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});
