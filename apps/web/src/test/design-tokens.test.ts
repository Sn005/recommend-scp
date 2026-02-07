import { readFileSync } from "fs";
import { resolve } from "path";

const CSS_FILE_PATH = resolve(__dirname, "../../../../mockups/design-tokens.css");

const readCss = (): string => readFileSync(CSS_FILE_PATH, "utf-8");

describe("design-tokens.css", () => {
  describe("AC-1: オブジェクトクラス全8色が定義されている", () => {
    it("Safe色が#10b981で定義されている", () => {
      const css = readCss();
      expect(css).toMatch(/--color-safe:\s*#10[Bb]981/);
    });

    it("Euclid色が#f59e0bで定義されている", () => {
      const css = readCss();
      expect(css).toMatch(/--color-euclid:\s*#[Ff]59[Ee]0[Bb]/);
    });

    it("Keter色が#ef4444で定義されている", () => {
      const css = readCss();
      expect(css).toMatch(/--color-keter:\s*#[Ee][Ff]4444/);
    });

    it("Thaumiel色が#6366f1で定義されている", () => {
      const css = readCss();
      expect(css).toMatch(/--color-thaumiel:\s*#6366[Ff]1/);
    });

    it("Neutralized色が#6b7280で定義されている", () => {
      const css = readCss();
      expect(css).toMatch(/--color-neutralized:\s*#6[Bb]7280/);
    });

    it("Apollyon色が#dc2626で定義されている", () => {
      const css = readCss();
      expect(css).toMatch(/--color-apollyon:\s*#[Dd][Cc]2626/);
    });

    it("Archon色が#8b5cf6で定義されている", () => {
      const css = readCss();
      expect(css).toMatch(/--color-archon:\s*#8[Bb]5[Cc][Ff]6/);
    });

    it("Unknown色が#9ca3afで定義されている", () => {
      const css = readCss();
      expect(css).toMatch(/--color-unknown:\s*#9[Cc][Aa]3[Aa][Ff]/);
    });
  });

  describe("AC-2: グラデーション変数が定義されている", () => {
    it("Safe用グラデーションが定義されている", () => {
      const css = readCss();
      expect(css).toMatch(/--gradient-safe:\s*linear-gradient\(135deg/);
    });

    it("Euclid用グラデーションが定義されている", () => {
      const css = readCss();
      expect(css).toMatch(/--gradient-euclid:\s*linear-gradient\(135deg/);
    });

    it("Keter用グラデーションが定義されている", () => {
      const css = readCss();
      expect(css).toMatch(/--gradient-keter:\s*linear-gradient\(135deg/);
    });

    it("Thaumiel用グラデーションが定義されている", () => {
      const css = readCss();
      expect(css).toMatch(/--gradient-thaumiel:\s*linear-gradient\(135deg/);
    });

    it("Neutralized用グラデーションが定義されている", () => {
      const css = readCss();
      expect(css).toMatch(/--gradient-neutralized:\s*linear-gradient\(135deg/);
    });

    it("Apollyon用グラデーションが定義されている", () => {
      const css = readCss();
      expect(css).toMatch(/--gradient-apollyon:\s*linear-gradient\(135deg/);
    });

    it("Archon用グラデーションが定義されている", () => {
      const css = readCss();
      expect(css).toMatch(/--gradient-archon:\s*linear-gradient\(135deg/);
    });

    it("Unknown用グラデーションが定義されている", () => {
      const css = readCss();
      expect(css).toMatch(/--gradient-unknown:\s*linear-gradient\(135deg/);
    });

    it("全グラデーションの方向が135degで統一されている", () => {
      const css = readCss();
      const gradientLines = css.match(/--gradient-[a-z]+:.*?;/gi) ?? [];
      expect(gradientLines.length).toBeGreaterThanOrEqual(8);
      const allUse135deg = gradientLines.every((g) => g.includes("135deg"));
      expect(allUse135deg).toBe(true);
    });
  });
});
