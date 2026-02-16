/**
 * @file Articles スキーマ制約強化テスト
 * @description 009-02-01: Zodスキーマ制約強化 - AC-2(検索クエリ)
 */

import { describe, it, expect } from "vitest";
import { searchArticlesSchema } from "../schema";

describe("009-02-01: Zodスキーマ制約強化 - articles", () => {
  describe("AC-2: 検索クエリ制約", () => {
    describe("正常系", () => {
      it("2文字の検索クエリが受け入れられる（最小値）", () => {
        const result = searchArticlesSchema.safeParse({ q: "ab" });
        expect(result.success).toBe(true);
      });

      it("50文字の検索クエリが受け入れられる", () => {
        const result = searchArticlesSchema.safeParse({ q: "a".repeat(50) });
        expect(result.success).toBe(true);
      });

      it("日本語の検索クエリが受け入れられる", () => {
        const result = searchArticlesSchema.safeParse({ q: "ホラー系の怖い話" });
        expect(result.success).toBe(true);
      });

      it("特殊文字を含む検索クエリが受け入れられる", () => {
        const result = searchArticlesSchema.safeParse({ q: "SCP-173 & SCP-096" });
        expect(result.success).toBe(true);
      });
    });

    describe("境界値", () => {
      it("200文字の検索クエリが受け入れられる（境界値上限）", () => {
        const result = searchArticlesSchema.safeParse({ q: "a".repeat(200) });
        expect(result.success).toBe(true);
      });

      it("201文字の検索クエリが拒否される（境界値超過）", () => {
        const result = searchArticlesSchema.safeParse({ q: "a".repeat(201) });
        expect(result.success).toBe(false);
      });

      it("1文字の検索クエリが拒否される（最小値未満）", () => {
        const result = searchArticlesSchema.safeParse({ q: "a" });
        expect(result.success).toBe(false);
      });
    });

    describe("エッジケース", () => {
      it("空文字列の検索クエリが拒否される", () => {
        const result = searchArticlesSchema.safeParse({ q: "" });
        expect(result.success).toBe(false);
      });
    });
  });
});
