/**
 * @file Onboarding スキーマ制約強化テスト
 * @description 009-02-01: Zodスキーマ制約強化 - AC-1(articleIds配列要素)
 */

import { describe, it, expect } from "vitest";
import { selectCustomSchema } from "../schema";

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000";

describe("009-02-01: Zodスキーマ制約強化 - onboarding", () => {
  describe("AC-1: articleIds要素のarticleId制約", () => {
    describe("正常系", () => {
      it("有効なarticleIdの配列が受け入れられる", () => {
        const result = selectCustomSchema.safeParse({
          visitorId: VALID_UUID,
          articleIds: ["scp-173", "scp-096", "scp-049"],
        });
        expect(result.success).toBe(true);
      });

      it("ハイフン・アンダースコア混在のarticleIdsが受け入れられる", () => {
        const result = selectCustomSchema.safeParse({
          visitorId: VALID_UUID,
          articleIds: ["SCP-1234-EX-JP", "scp_001", "test-article_123"],
        });
        expect(result.success).toBe(true);
      });
    });

    describe("境界値", () => {
      it("100文字のarticleIdを含む配列が受け入れられる（境界値上限）", () => {
        const result = selectCustomSchema.safeParse({
          visitorId: VALID_UUID,
          articleIds: ["a".repeat(100), "scp-096", "scp-049"],
        });
        expect(result.success).toBe(true);
      });

      it("101文字のarticleIdを含む配列が拒否される（境界値超過）", () => {
        const result = selectCustomSchema.safeParse({
          visitorId: VALID_UUID,
          articleIds: ["a".repeat(101), "scp-096", "scp-049"],
        });
        expect(result.success).toBe(false);
      });
    });

    describe("異常系: 不正文字", () => {
      it("スクリプトタグを含むarticleIdが配列内にあると拒否される", () => {
        const result = selectCustomSchema.safeParse({
          visitorId: VALID_UUID,
          articleIds: ["scp-173", "<script>alert('XSS')</script>", "scp-049"],
        });
        expect(result.success).toBe(false);
      });

      it("日本語を含むarticleIdが配列内にあると拒否される", () => {
        const result = selectCustomSchema.safeParse({
          visitorId: VALID_UUID,
          articleIds: ["scp-173", "scp-日本語", "scp-049"],
        });
        expect(result.success).toBe(false);
      });

      it("スペースを含むarticleIdが配列内にあると拒否される", () => {
        const result = selectCustomSchema.safeParse({
          visitorId: VALID_UUID,
          articleIds: ["scp-173", "scp 096", "scp-049"],
        });
        expect(result.success).toBe(false);
      });
    });
  });
});
