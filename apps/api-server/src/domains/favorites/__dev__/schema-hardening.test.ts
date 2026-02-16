/**
 * @file Favorites スキーマ制約強化テスト
 * @description 009-02-01: Zodスキーマ制約強化 - AC-1(articleIdパラメータ)
 */

import { describe, it, expect } from "vitest";
import { articleIdParamSchema } from "../schema";

describe("009-02-01: Zodスキーマ制約強化 - favorites", () => {
  describe("AC-1: articleIdパラメータ制約", () => {
    describe("正常系", () => {
      it("有効なarticleId（scp-173）が受け入れられる", () => {
        const result = articleIdParamSchema.safeParse({ articleId: "scp-173" });
        expect(result.success).toBe(true);
      });

      it("アンダースコアを含むarticleIdが受け入れられる", () => {
        const result = articleIdParamSchema.safeParse({ articleId: "scp_001" });
        expect(result.success).toBe(true);
      });
    });

    describe("境界値", () => {
      it("100文字のarticleIdが受け入れられる（境界値上限）", () => {
        const result = articleIdParamSchema.safeParse({ articleId: "a".repeat(100) });
        expect(result.success).toBe(true);
      });

      it("101文字のarticleIdが拒否される（境界値超過）", () => {
        const result = articleIdParamSchema.safeParse({ articleId: "a".repeat(101) });
        expect(result.success).toBe(false);
      });
    });

    describe("異常系: 不正文字", () => {
      it("スクリプトタグを含むarticleIdが拒否される", () => {
        const result = articleIdParamSchema.safeParse({ articleId: "<script>" });
        expect(result.success).toBe(false);
      });

      it("日本語を含むarticleIdが拒否される", () => {
        const result = articleIdParamSchema.safeParse({ articleId: "scp-日本語" });
        expect(result.success).toBe(false);
      });

      it("スペースを含むarticleIdが拒否される", () => {
        const result = articleIdParamSchema.safeParse({ articleId: "scp 173" });
        expect(result.success).toBe(false);
      });
    });
  });
});
