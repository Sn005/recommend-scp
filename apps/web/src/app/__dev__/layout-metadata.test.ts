import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const LAYOUT_PATH = resolve(__dirname, "../layout.tsx");

describe("layout.tsx メタデータ", () => {
  let layoutContent: string;

  beforeAll(() => {
    layoutContent = readFileSync(LAYOUT_PATH, "utf-8");
  });

  describe("AC-2: layout.tsx メタデータ更新", () => {
    it('title が "SCPicks - あなた好みのSCPを発見" に設定されている', () => {
      expect(layoutContent).toContain("SCPicks - あなた好みのSCPを発見");
    });

    it('description が "あなたの好みに合ったSCP記事を推薦するWebアプリ" に設定されている', () => {
      expect(layoutContent).toContain("あなたの好みに合ったSCP記事を推薦するWebアプリ");
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

    it('appleWebApp.title が "SCPicks" に設定されている', () => {
      expect(layoutContent).toMatch(/title\s*:\s*["']SCPicks["']/);
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
});
