/**
 * @file Feedback スキーマ制約強化テスト
 * @description 009-02-01: Zodスキーマ制約強化 - AC-1(articleId), AC-3(dwellTime)
 */

import { describe, it, expect } from "vitest";
import { recordFeedbackSchema } from "../schema";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

describe("009-02-01: Zodスキーマ制約強化 - feedback", () => {
  describe("AC-1: articleId制約", () => {
    describe("正常系", () => {
      it("有効なarticleId（scp-173）が受け入れられる", () => {
        const result = recordFeedbackSchema.safeParse({
          visitorId: VALID_UUID,
          articleId: "scp-173",
          type: "like",
        });
        expect(result.success).toBe(true);
      });

      it("有効なarticleId（SCP-XXXX-EX-JP）が受け入れられる", () => {
        const result = recordFeedbackSchema.safeParse({
          visitorId: VALID_UUID,
          articleId: "SCP-1234-EX-JP",
          type: "like",
        });
        expect(result.success).toBe(true);
      });

      it("アンダースコアを含むarticleIdが受け入れられる", () => {
        const result = recordFeedbackSchema.safeParse({
          visitorId: VALID_UUID,
          articleId: "scp_001",
          type: "like",
        });
        expect(result.success).toBe(true);
      });

      it("1文字のarticleIdが受け入れられる（最小値）", () => {
        const result = recordFeedbackSchema.safeParse({
          visitorId: VALID_UUID,
          articleId: "a",
          type: "like",
        });
        expect(result.success).toBe(true);
      });

      it("数字のみのarticleIdが受け入れられる", () => {
        const result = recordFeedbackSchema.safeParse({
          visitorId: VALID_UUID,
          articleId: "12345",
          type: "like",
        });
        expect(result.success).toBe(true);
      });
    });

    describe("境界値", () => {
      it("100文字のarticleIdが受け入れられる（境界値上限）", () => {
        const result = recordFeedbackSchema.safeParse({
          visitorId: VALID_UUID,
          articleId: "a".repeat(100),
          type: "like",
        });
        expect(result.success).toBe(true);
      });

      it("101文字のarticleIdが拒否される（境界値超過）", () => {
        const result = recordFeedbackSchema.safeParse({
          visitorId: VALID_UUID,
          articleId: "a".repeat(101),
          type: "like",
        });
        expect(result.success).toBe(false);
      });
    });

    describe("異常系: 不正文字", () => {
      it("スクリプトタグを含むarticleIdが拒否される", () => {
        const result = recordFeedbackSchema.safeParse({
          visitorId: VALID_UUID,
          articleId: "<script>alert('XSS')</script>",
          type: "like",
        });
        expect(result.success).toBe(false);
      });

      it("日本語を含むarticleIdが拒否される", () => {
        const result = recordFeedbackSchema.safeParse({
          visitorId: VALID_UUID,
          articleId: "scp-173-日本語",
          type: "like",
        });
        expect(result.success).toBe(false);
      });

      it("スペースを含むarticleIdが拒否される", () => {
        const result = recordFeedbackSchema.safeParse({
          visitorId: VALID_UUID,
          articleId: "scp 173",
          type: "like",
        });
        expect(result.success).toBe(false);
      });

      it("特殊文字（@）を含むarticleIdが拒否される", () => {
        const result = recordFeedbackSchema.safeParse({
          visitorId: VALID_UUID,
          articleId: "scp@173",
          type: "like",
        });
        expect(result.success).toBe(false);
      });

      it("特殊文字（/）を含むarticleIdが拒否される", () => {
        const result = recordFeedbackSchema.safeParse({
          visitorId: VALID_UUID,
          articleId: "scp/173",
          type: "like",
        });
        expect(result.success).toBe(false);
      });

      it("空文字列のarticleIdが拒否される", () => {
        const result = recordFeedbackSchema.safeParse({
          visitorId: VALID_UUID,
          articleId: "",
          type: "like",
        });
        expect(result.success).toBe(false);
      });
    });
  });

  describe("AC-3: メタデータdwellTime制約", () => {
    describe("正常系", () => {
      it("0秒のdwellTimeが受け入れられる（最小値）", () => {
        const result = recordFeedbackSchema.safeParse({
          visitorId: VALID_UUID,
          articleId: "scp-173",
          type: "skip",
          metadata: { scrollDepth: 0, dwellTime: 0, interestLevel: "skip" },
        });
        expect(result.success).toBe(true);
      });

      it("3600秒（1時間）のdwellTimeが受け入れられる", () => {
        const result = recordFeedbackSchema.safeParse({
          visitorId: VALID_UUID,
          articleId: "scp-173",
          type: "skip",
          metadata: { scrollDepth: 50, dwellTime: 3600, interestLevel: "neutral" },
        });
        expect(result.success).toBe(true);
      });
    });

    describe("境界値", () => {
      it("86400秒（24時間）のdwellTimeが受け入れられる（境界値上限）", () => {
        const result = recordFeedbackSchema.safeParse({
          visitorId: VALID_UUID,
          articleId: "scp-173",
          type: "skip",
          metadata: { scrollDepth: 100, dwellTime: 86400, interestLevel: "like" },
        });
        expect(result.success).toBe(true);
      });

      it("86401秒のdwellTimeが拒否される（境界値超過）", () => {
        const result = recordFeedbackSchema.safeParse({
          visitorId: VALID_UUID,
          articleId: "scp-173",
          type: "skip",
          metadata: { scrollDepth: 100, dwellTime: 86401, interestLevel: "like" },
        });
        expect(result.success).toBe(false);
      });

      it("86399秒のdwellTimeが受け入れられる（境界値-1）", () => {
        const result = recordFeedbackSchema.safeParse({
          visitorId: VALID_UUID,
          articleId: "scp-173",
          type: "skip",
          metadata: { scrollDepth: 50, dwellTime: 86399, interestLevel: "neutral" },
        });
        expect(result.success).toBe(true);
      });

      it("負のdwellTimeが拒否される（最小値未満）", () => {
        const result = recordFeedbackSchema.safeParse({
          visitorId: VALID_UUID,
          articleId: "scp-173",
          type: "skip",
          metadata: { scrollDepth: 0, dwellTime: -1, interestLevel: "skip" },
        });
        expect(result.success).toBe(false);
      });
    });

    describe("エッジケース", () => {
      it("非常に大きなdwellTime（100万秒）が拒否される", () => {
        const result = recordFeedbackSchema.safeParse({
          visitorId: VALID_UUID,
          articleId: "scp-173",
          type: "skip",
          metadata: { scrollDepth: 50, dwellTime: 1000000, interestLevel: "neutral" },
        });
        expect(result.success).toBe(false);
      });
    });
  });
});
