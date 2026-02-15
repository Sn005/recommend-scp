import { describe, it, expect } from "vitest";
import { isValidTestId } from "../../eslint-rules/data-testid-naming";

describe("data-testid命名規則バリデーション", () => {
  describe("正常系: kebab-case形式", () => {
    it("単一コンポーネント名が許可される", () => {
      expect(isValidTestId("button")).toBe(true);
    });

    it("コンポーネント-要素パターンが許可される", () => {
      expect(isValidTestId("article-card")).toBe(true);
    });

    it("コンポーネント-要素-バリアントパターンが許可される", () => {
      expect(isValidTestId("pack-selector-horror")).toBe(true);
    });

    it("数字を含むkebab-caseが許可される", () => {
      expect(isValidTestId("step-2-button")).toBe(true);
    });

    it("既存のdata-testidが全て許可される", () => {
      const existingIds = [
        "onboarding-layout",
        "drawer-provider",
        "article-card",
        "pack-selector",
        "next-button",
        "onboarding-progress",
      ];
      for (const id of existingIds) {
        expect(isValidTestId(id)).toBe(true);
      }
    });
  });

  describe("異常系: 不正な形式", () => {
    it("camelCaseが拒否される", () => {
      expect(isValidTestId("articleCard")).toBe(false);
    });

    it("snake_caseが拒否される", () => {
      expect(isValidTestId("article_card")).toBe(false);
    });

    it("数字始まりが拒否される", () => {
      expect(isValidTestId("1-button")).toBe(false);
    });

    it("大文字を含む値が拒否される", () => {
      expect(isValidTestId("Article-card")).toBe(false);
    });

    it("空文字列が拒否される", () => {
      expect(isValidTestId("")).toBe(false);
    });

    it("連続ハイフンが拒否される", () => {
      expect(isValidTestId("article--card")).toBe(false);
    });

    it("末尾ハイフンが拒否される", () => {
      expect(isValidTestId("article-card-")).toBe(false);
    });

    it("先頭ハイフンが拒否される", () => {
      expect(isValidTestId("-article-card")).toBe(false);
    });
  });
});
