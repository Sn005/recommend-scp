import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const MANIFEST_PATH = resolve(__dirname, "../../../public/manifest.json");

describe("manifest.json", () => {
  describe("AC-1: manifest.json の配置", () => {
    let manifest: Record<string, unknown>;

    beforeAll(() => {
      const content = readFileSync(MANIFEST_PATH, "utf-8");
      manifest = JSON.parse(content) as Record<string, unknown>;
    });

    it("manifest.json ファイルが存在する", () => {
      expect(existsSync(MANIFEST_PATH)).toBe(true);
    });

    it("有効なJSONとしてパースできる", () => {
      const content = readFileSync(MANIFEST_PATH, "utf-8");
      expect(() => {
        JSON.parse(content) as unknown;
      }).not.toThrow();
    });

    it('name が "SCPicks - あなた好みのSCPを発見" である', () => {
      expect(manifest.name).toBe("SCPicks - あなた好みのSCPを発見");
    });

    it('short_name が "SCPicks" である', () => {
      expect(manifest.short_name).toBe("SCPicks");
    });

    it('description が "あなたの好みに合ったSCP記事を推薦するWebアプリ" である', () => {
      expect(manifest.description).toBe("あなたの好みに合ったSCP記事を推薦するWebアプリ");
    });

    it('start_url が "/" である', () => {
      expect(manifest.start_url).toBe("/");
    });

    it('display が "standalone" である', () => {
      expect(manifest.display).toBe("standalone");
    });

    it('background_color が "#FFFFFF" である', () => {
      expect(manifest.background_color).toBe("#FFFFFF");
    });

    it('theme_color が "#FFFFFF" である', () => {
      expect(manifest.theme_color).toBe("#FFFFFF");
    });

    it('orientation が "portrait" である', () => {
      expect(manifest.orientation).toBe("portrait");
    });

    it('lang が "ja" である', () => {
      expect(manifest.lang).toBe("ja");
    });

    it("icons 配列が存在し空でない", () => {
      expect(Array.isArray(manifest.icons)).toBe(true);
      expect((manifest.icons as unknown[]).length).toBeGreaterThanOrEqual(3);
    });

    it("192x192 アイコンが定義されている", () => {
      const icons = manifest.icons as {
        sizes: string;
        src: string;
        type?: string;
      }[];
      const icon192 = icons.find((icon) => icon.sizes === "192x192");
      expect(icon192).toBeDefined();
      expect(icon192?.src).toBe("/icons/icon-192x192.png");
      expect(icon192?.type).toBe("image/png");
    });

    it("512x512 アイコンが定義されている", () => {
      const icons = manifest.icons as {
        sizes: string;
        src: string;
        type?: string;
        purpose?: string;
      }[];
      const icon512 = icons.find((icon) => icon.sizes === "512x512" && !icon.purpose);
      expect(icon512).toBeDefined();
      expect(icon512?.src).toBe("/icons/icon-512x512.png");
      expect(icon512?.type).toBe("image/png");
    });

    it("512x512 maskable アイコンが定義されている", () => {
      const icons = manifest.icons as {
        sizes: string;
        src: string;
        purpose?: string;
      }[];
      const maskableIcon = icons.find((icon) => icon.purpose === "maskable");
      expect(maskableIcon).toBeDefined();
      expect(maskableIcon?.sizes).toBe("512x512");
      expect(maskableIcon?.src).toBe("/icons/icon-512x512.png");
    });

    it("必須フィールドが全て揃っている", () => {
      const requiredFields = [
        "name",
        "short_name",
        "description",
        "start_url",
        "display",
        "background_color",
        "theme_color",
        "orientation",
        "lang",
        "icons",
      ];
      for (const field of requiredFields) {
        expect(manifest[field], `${field} が未定義`).toBeDefined();
      }
    });
  });
});
