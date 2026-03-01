import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const TWITTER_IMAGE_PATH = resolve(__dirname, "../twitter-image.tsx");

describe("Twitter画像（twitter-image.tsx）", () => {
  describe("AC-3: ファイル存在確認", () => {
    it("twitter-image.tsx ファイルが存在する", () => {
      expect(existsSync(TWITTER_IMAGE_PATH)).toBe(true);
    });
  });

  describe("AC-3/AC-4: opengraph-image.tsx との連携", () => {
    it("opengraph-image.tsx を再エクスポートしている", () => {
      const content = readFileSync(TWITTER_IMAGE_PATH, "utf-8");
      expect(content).toMatch(
        /export\s*\{[^}]*default[^}]*\}\s*from\s*["']\.\/opengraph-image["']/
      );
    });

    it("size 設定も再エクスポートしている", () => {
      const content = readFileSync(TWITTER_IMAGE_PATH, "utf-8");
      expect(content).toMatch(
        /export\s*(\{[^}]*size[^}]*\}|\*)\s*from\s*["']\.\/opengraph-image["']/
      );
    });
  });

  describe("AC-4: ルートレイアウトのデフォルトOGPとして機能する", () => {
    it("layout.tsx に metadataBase が設定されている", () => {
      const layoutPath = resolve(__dirname, "../layout.tsx");
      const layoutContent = readFileSync(layoutPath, "utf-8");
      expect(layoutContent).toContain("metadataBase");
      expect(layoutContent).toMatch(/siteConfig\.url/);
    });

    it("layout.tsx に title.template が設定されている（ページ固有オーバーライド対応）", () => {
      const layoutPath = resolve(__dirname, "../layout.tsx");
      const layoutContent = readFileSync(layoutPath, "utf-8");
      expect(layoutContent).toContain("template");
      expect(layoutContent).toContain("%s");
    });
  });
});
