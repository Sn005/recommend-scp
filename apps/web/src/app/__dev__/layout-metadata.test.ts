import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const LAYOUT_PATH = resolve(__dirname, "../layout.tsx");

describe("layout.tsx メタデータ", () => {
  let layoutContent: string;

  beforeAll(() => {
    layoutContent = readFileSync(LAYOUT_PATH, "utf-8");
  });

  describe("AC-2: layout.tsx メタデータ更新", () => {
    it("title.default が SITE_NAME を含むテンプレートリテラルで設定されている", () => {
      expect(layoutContent).toContain("あなた好みのSCPを発見");
      expect(layoutContent).toMatch(/default\s*:\s*`/);
    });

    it("description が siteConfig.description から設定されている", () => {
      expect(layoutContent).toMatch(/description\s*:\s*siteConfig\.description/);
    });

    it('manifest が "/manifest.json" を指している', () => {
      expect(layoutContent).toMatch(/manifest\s*:\s*["']\/manifest\.json["']/);
    });

    it("appleWebApp.capable が true に設定されている", () => {
      expect(layoutContent).toMatch(/capable\s*:\s*true/);
    });

    it('appleWebApp.statusBarStyle が "default" に設定されている', () => {
      expect(layoutContent).toMatch(/statusBarStyle\s*:\s*["']default["']/);
    });

    it("appleWebApp.title が siteConfig.name に設定されている", () => {
      expect(layoutContent).toMatch(/title\s*:\s*siteConfig\.name/);
    });
  });

  describe("AC-3: HTMLレンダリング確認", () => {
    it("manifest フィールドが metadata に含まれている", () => {
      expect(layoutContent).toMatch(/manifest\s*:\s*["']\/manifest\.json["']/);
    });

    it("appleWebApp オブジェクトが metadata 内に存在する", () => {
      expect(layoutContent).toMatch(/appleWebApp\s*:/);
    });

    it("capable: true が含まれている（apple-mobile-web-app-capable 相当）", () => {
      expect(layoutContent).toMatch(/capable\s*:\s*true/);
    });

    it("statusBarStyle が含まれている（apple-mobile-web-app-status-bar-style 相当）", () => {
      expect(layoutContent).toMatch(/statusBarStyle/);
    });
  });

  describe("SEO: Open Graph メタデータ", () => {
    it('og:type が "website" に設定されている', () => {
      expect(layoutContent).toMatch(/type\s*:\s*["']website["']/);
    });

    it("og:siteName が設定されている", () => {
      expect(layoutContent).toMatch(/siteName\s*:\s*siteConfig\.name/);
    });

    it("og:locale が設定されている", () => {
      expect(layoutContent).toMatch(/locale\s*:\s*siteConfig\.locale/);
    });

    it("og:images に旧アイコン（icon-512x512.png）が残っていない", () => {
      // opengraph-image.tsx による動的生成に切り替えたため
      expect(layoutContent).not.toContain("icon-512x512.png");
    });

    it("og:title が設定されている", () => {
      expect(layoutContent).toMatch(/openGraph[\s\S]*title/);
    });

    it("og:description が設定されている", () => {
      expect(layoutContent).toMatch(/openGraph[\s\S]*description/);
    });
  });

  describe("SEO: Twitter Card メタデータ", () => {
    it('twitter:card が "summary_large_image" に設定されている', () => {
      expect(layoutContent).toMatch(/card\s*:\s*["']summary_large_image["']/);
    });

    it("twitter:title が設定されている", () => {
      expect(layoutContent).toMatch(/twitter[\s\S]*title/);
    });

    it("twitter:description が設定されている", () => {
      expect(layoutContent).toMatch(/twitter[\s\S]*description/);
    });

    it("twitter:images は twitter-image.tsx 規約で自動設定されるため layout.tsx に不要", () => {
      // twitter-image.tsx が存在するため、layout.tsx の twitter config に images は不要
      // images フィールドが twitter ブロック内に残っていないことを確認
      const twitterMatch = /twitter\s*:\s*\{[^}]*\}/.exec(layoutContent);
      expect(twitterMatch).not.toBeNull();
      expect(twitterMatch?.[0]).not.toContain("images");
    });
  });

  describe("SEO: metadataBase と title template", () => {
    it("metadataBase が設定されている", () => {
      expect(layoutContent).toContain("metadataBase");
    });

    it("title template が設定されている", () => {
      expect(layoutContent).toContain("template");
      expect(layoutContent).toContain("%s");
    });
  });

  describe("SEO: JSON-LD 構造化データ", () => {
    it("application/ld+json スクリプトタグが含まれている", () => {
      expect(layoutContent).toContain("application/ld+json");
    });

    it("WebSite スキーマが含まれている", () => {
      expect(layoutContent).toContain("WebSite");
    });

    it("WebApplication スキーマが含まれている", () => {
      expect(layoutContent).toContain("WebApplication");
    });

    it("schema.org コンテキストが含まれている", () => {
      expect(layoutContent).toContain("https://schema.org");
    });

    it("XSS対策として < がエスケープされている", () => {
      expect(layoutContent).toContain("\\u003c");
    });
  });

  describe("SEO: robots と canonical", () => {
    it("robots 設定が含まれている", () => {
      expect(layoutContent).toMatch(/robots\s*:/);
    });

    it("alternates.canonical が設定されている", () => {
      expect(layoutContent).toMatch(/canonical\s*:/);
    });
  });
});
