import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const OGP_IMAGE_PATH = resolve(__dirname, "../opengraph-image.tsx");

describe("OGP画像生成（opengraph-image.tsx）", () => {
  let content: string;

  beforeAll(() => {
    content = readFileSync(OGP_IMAGE_PATH, "utf-8");
  });

  describe("AC-1: OGP画像ファイルの存在確認", () => {
    it("opengraph-image.tsx ファイルが存在する", () => {
      expect(existsSync(OGP_IMAGE_PATH)).toBe(true);
    });
  });

  describe("AC-1: 画像サイズ設定（1200x630px）", () => {
    it("width が 1200 に設定されている", () => {
      expect(content).toMatch(/width\s*:\s*1200/);
    });

    it("height が 630 に設定されている", () => {
      expect(content).toMatch(/height\s*:\s*630/);
    });

    it("size エクスポートが存在する", () => {
      expect(content).toMatch(/export\s+const\s+size/);
    });
  });

  describe("AC-1: アプリ名の表示", () => {
    it("アプリ名 SCPicks がソースに含まれている", () => {
      expect(content).toContain("SCPicks");
    });
  });

  describe("AC-1: キャッチコピーの表示", () => {
    it("キャッチコピー「あなた好みのSCPを推薦」がソースに含まれている", () => {
      expect(content).toContain("あなた好みのSCPを推薦");
    });
  });

  describe("AC-1: ブランドカラーの使用", () => {
    it("ブランドカラー #3B82F6（ブルー）が使用されている", () => {
      expect(content).toMatch(/#3[Bb]82[Ff]6/);
    });

    it("ブランドカラー #FFFFFF（ホワイト）が使用されている", () => {
      expect(content).toMatch(/#(FFFFFF|ffffff)/);
    });
  });

  describe("AC-1: ImageResponse API の使用", () => {
    it("ImageResponse が next/og からインポートされている", () => {
      expect(content).toMatch(/import.*ImageResponse.*from\s+["']next\/og["']/);
    });

    it("デフォルトエクスポート（生成関数）が存在する", () => {
      expect(content).toMatch(/export\s+default\s+(async\s+)?function/);
    });
  });

  describe("AC-1: alt テキストの設定", () => {
    it("alt エクスポートが存在する", () => {
      expect(content).toMatch(/export\s+const\s+alt/);
    });
  });

  describe("AC-1: content-type の設定", () => {
    it("contentType エクスポートが存在する", () => {
      expect(content).toMatch(/export\s+const\s+contentType/);
    });
  });
});
