import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const PUBLIC_DIR = resolve(__dirname, "../../../public");
const ICONS_DIR = resolve(PUBLIC_DIR, "icons");

interface ManifestIcon {
  src: string;
  sizes: string;
  type: string;
  purpose?: string;
}

function assertDefined<T>(val: T | undefined): asserts val is T {
  expect(val).toBeDefined();
}

describe("アプリアイコン配置", () => {
  describe("AC-1: アイコンファイルの配置", () => {
    it("icons/ ディレクトリが存在する", () => {
      expect(existsSync(ICONS_DIR)).toBe(true);
    });

    it("icon-192x192.png が icons/ に存在する", () => {
      expect(existsSync(resolve(ICONS_DIR, "icon-192x192.png"))).toBe(true);
    });

    it("icon-512x512.png が icons/ に存在する", () => {
      expect(existsSync(resolve(ICONS_DIR, "icon-512x512.png"))).toBe(true);
    });

    it("apple-touch-icon.png が public/ 直下に存在する", () => {
      expect(existsSync(resolve(PUBLIC_DIR, "apple-touch-icon.png"))).toBe(true);
    });

    it("favicon.ico が public/ 直下に存在する", () => {
      expect(existsSync(resolve(PUBLIC_DIR, "favicon.ico"))).toBe(true);
    });
  });

  describe("AC-2: manifest.json との整合性", () => {
    let manifestIcons: ManifestIcon[];

    beforeAll(() => {
      const manifestPath = resolve(PUBLIC_DIR, "manifest.json");
      const content = readFileSync(manifestPath, "utf-8");
      const manifest = JSON.parse(content) as { icons: ManifestIcon[] };
      manifestIcons = manifest.icons;
    });

    it("manifest.json の全 icons エントリに対応するファイルが存在する", () => {
      for (const icon of manifestIcons) {
        const filePath = resolve(PUBLIC_DIR, icon.src.replace(/^\//, ""));
        expect(existsSync(filePath), `${icon.src} が存在しない`).toBe(true);
      }
    });

    it("manifest.json で参照されている icon-192x192.png が存在する", () => {
      const icon = manifestIcons.find((i) => i.sizes === "192x192");
      assertDefined(icon);
      const filePath = resolve(PUBLIC_DIR, icon.src.replace(/^\//, ""));
      expect(existsSync(filePath)).toBe(true);
    });

    it("manifest.json で参照されている icon-512x512.png が存在する", () => {
      const icon = manifestIcons.find((i) => i.sizes === "512x512" && !i.purpose);
      assertDefined(icon);
      const filePath = resolve(PUBLIC_DIR, icon.src.replace(/^\//, ""));
      expect(existsSync(filePath)).toBe(true);
    });

    it("manifest.json で purpose: maskable として参照されているファイルが存在する", () => {
      const maskableIcon = manifestIcons.find((i) => i.purpose === "maskable");
      assertDefined(maskableIcon);
      const filePath = resolve(PUBLIC_DIR, maskableIcon.src.replace(/^\//, ""));
      expect(existsSync(filePath)).toBe(true);
    });
  });

  describe("AC-3/AC-4: ファイル形式の検証", () => {
    it("icon-192x192.png が空ファイルでない", () => {
      const { size } = statSync(resolve(ICONS_DIR, "icon-192x192.png"));
      expect(size).toBeGreaterThan(0);
    });

    it("icon-512x512.png が空ファイルでない", () => {
      const { size } = statSync(resolve(ICONS_DIR, "icon-512x512.png"));
      expect(size).toBeGreaterThan(0);
    });

    it("apple-touch-icon.png が空ファイルでない", () => {
      const { size } = statSync(resolve(PUBLIC_DIR, "apple-touch-icon.png"));
      expect(size).toBeGreaterThan(0);
    });

    it("favicon.ico が空ファイルでない", () => {
      const { size } = statSync(resolve(PUBLIC_DIR, "favicon.ico"));
      expect(size).toBeGreaterThan(0);
    });

    it("icon-192x192.png が PNG シグネチャを持つ", () => {
      const buffer = readFileSync(resolve(ICONS_DIR, "icon-192x192.png"));
      expect(buffer[0]).toBe(0x89);
      expect(buffer[1]).toBe(0x50);
      expect(buffer[2]).toBe(0x4e);
      expect(buffer[3]).toBe(0x47);
    });

    it("icon-512x512.png が PNG シグネチャを持つ", () => {
      const buffer = readFileSync(resolve(ICONS_DIR, "icon-512x512.png"));
      expect(buffer[0]).toBe(0x89);
      expect(buffer[1]).toBe(0x50);
      expect(buffer[2]).toBe(0x4e);
      expect(buffer[3]).toBe(0x47);
    });

    it("apple-touch-icon.png が PNG シグネチャを持つ", () => {
      const buffer = readFileSync(resolve(PUBLIC_DIR, "apple-touch-icon.png"));
      expect(buffer[0]).toBe(0x89);
      expect(buffer[1]).toBe(0x50);
      expect(buffer[2]).toBe(0x4e);
      expect(buffer[3]).toBe(0x47);
    });

    it("favicon.ico が ICO シグネチャを持つ", () => {
      const buffer = readFileSync(resolve(PUBLIC_DIR, "favicon.ico"));
      expect(buffer[0]).toBe(0x00);
      expect(buffer[1]).toBe(0x00);
      expect(buffer[2]).toBe(0x01);
      expect(buffer[3]).toBe(0x00);
    });
  });
});
