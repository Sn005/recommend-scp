import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";

const PUBLIC_DIR = resolve(__dirname, "../../../public");
const SPLASH_DIR = resolve(PUBLIC_DIR, "splash");
const MANIFEST_PATH = resolve(PUBLIC_DIR, "manifest.json");
const LAYOUT_PATH = resolve(__dirname, "../layout.tsx");
const SW_PATH = resolve(PUBLIC_DIR, "sw.js");
const GEN_SPLASH_SCRIPT_PATH = resolve(__dirname, "../../../scripts/gen-splash.ts");

interface ManifestJson {
  name: string;
  short_name: string;
  start_url: string;
  display: string;
  background_color: string;
  theme_color: string;
  orientation: string;
  lang: string;
  icons: { src: string; sizes: string; type: string; purpose?: string }[];
}

const SPLASH_FILES = [
  "splash-750x1334.png",
  "splash-1170x2532.png",
  "splash-1179x2556.png",
  "splash-1290x2796.png",
  "splash-1640x2360.png",
  "splash-1668x2388.png",
  "splash-2048x2732.png",
];

describe("PWAスプラッシュスクリーン", () => {
  let manifest: ManifestJson;
  let layoutContent: string;

  beforeAll(() => {
    manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf-8")) as ManifestJson;
    layoutContent = readFileSync(LAYOUT_PATH, "utf-8");
  });

  describe("AC-1: Androidスプラッシュスクリーン用 manifest.json フィールド", () => {
    it("theme_color がブランドカラー #3B82F6 に設定されている", () => {
      expect(manifest.theme_color).toBe("#3B82F6");
    });

    it("background_color がブランドカラー #3B82F6 に設定されている", () => {
      expect(manifest.background_color).toBe("#3B82F6");
    });

    it("name が「SCPicks - あなた好みのSCPを発見」である", () => {
      expect(manifest.name).toBe("SCPicks - あなた好みのSCPを発見");
    });

    it("short_name が「SCPicks」である", () => {
      expect(manifest.short_name).toBe("SCPicks");
    });

    it("192x192 アイコンが定義されている", () => {
      const icon = manifest.icons.find((i) => i.sizes === "192x192");
      expect(icon).toBeDefined();
      expect(icon?.src).toBe("/icons/icon-192x192.png");
    });

    it("512x512 アイコンが定義されている", () => {
      const icon = manifest.icons.find((i) => i.sizes === "512x512" && !i.purpose);
      expect(icon).toBeDefined();
      expect(icon?.src).toBe("/icons/icon-512x512.png");
    });

    it("maskable アイコンが定義されている", () => {
      const icon = manifest.icons.find((i) => i.purpose === "maskable");
      expect(icon).toBeDefined();
      expect(icon?.sizes).toBe("512x512");
    });

    it("display が standalone に設定されている", () => {
      expect(manifest.display).toBe("standalone");
    });
  });

  describe("AC-2: iOSスプラッシュ画像ファイルの配置", () => {
    it("splash/ ディレクトリが存在する", () => {
      expect(existsSync(SPLASH_DIR)).toBe(true);
    });

    it.each(SPLASH_FILES)("%s が splash/ ディレクトリに存在する", (filename) => {
      expect(existsSync(resolve(SPLASH_DIR, filename)), `${filename} が存在しない`).toBe(true);
    });

    it.each(SPLASH_FILES)("%s が空ファイルでない", (filename) => {
      const { size } = statSync(resolve(SPLASH_DIR, filename));
      expect(size).toBeGreaterThan(0);
    });

    it.each(SPLASH_FILES)("%s が PNG シグネチャを持つ", (filename) => {
      const buffer = readFileSync(resolve(SPLASH_DIR, filename));
      expect(buffer[0]).toBe(0x89);
      expect(buffer[1]).toBe(0x50);
      expect(buffer[2]).toBe(0x4e);
      expect(buffer[3]).toBe(0x47);
    });

    it.each(SPLASH_FILES)("%s が最低 1KB 以上の容量を持つ", (filename) => {
      const { size } = statSync(resolve(SPLASH_DIR, filename));
      expect(size).toBeGreaterThan(1024);
    });

    it("splash/ ディレクトリに .png 以外のファイルが混入していない", () => {
      const files = readdirSync(SPLASH_DIR);
      const nonPngFiles = files.filter((f) => !f.endsWith(".png"));
      expect(nonPngFiles).toHaveLength(0);
    });
  });

  describe("AC-2: layout.tsx の apple-touch-startup-image メタタグ", () => {
    it("appleWebApp.startupImage が定義されている", () => {
      expect(layoutContent).toMatch(/startupImage/);
    });

    it.each(SPLASH_FILES)("layout.tsx に %s への参照が含まれている", (filename) => {
      expect(layoutContent).toContain(filename);
    });

    it("iPhone SE 用 media クエリ（375x667 / ratio:2）が設定されている", () => {
      expect(layoutContent).toMatch(/device-width:\s*375px/);
      expect(layoutContent).toMatch(/device-height:\s*667px/);
    });

    it("iPhone 14 Pro Max 用 media クエリ（430x932 / ratio:3）が設定されている", () => {
      expect(layoutContent).toMatch(/device-width:\s*430px/);
      expect(layoutContent).toMatch(/device-height:\s*932px/);
    });
  });

  describe("AC-3: スプラッシュスクリーンのデザイン統一性", () => {
    it("layout.tsx の themeColor がブランドカラー #3B82F6 に更新されている", () => {
      expect(layoutContent).toMatch(/themeColor\s*:\s*["']#3B82F6["']/);
    });

    it("スプラッシュ画像生成スクリプトがブランドカラー #3B82F6 を参照している", () => {
      const scriptContent = readFileSync(GEN_SPLASH_SCRIPT_PATH, "utf-8");
      expect(scriptContent).toMatch(/#3[Bb]82[Ff]6/);
    });

    it("スプラッシュ画像生成スクリプトがロゴカラー #FFFFFF を参照している", () => {
      const scriptContent = readFileSync(GEN_SPLASH_SCRIPT_PATH, "utf-8");
      expect(scriptContent).toMatch(/#(FFFFFF|ffffff)/);
    });
  });

  describe("AC-4: 既存PWA機能への影響なし", () => {
    it('manifest.json の start_url が "/" のまま維持されている', () => {
      expect(manifest.start_url).toBe("/");
    });

    it('manifest.json の display が "standalone" のまま維持されている', () => {
      expect(manifest.display).toBe("standalone");
    });

    it('manifest.json の orientation が "portrait" のまま維持されている', () => {
      expect(manifest.orientation).toBe("portrait");
    });

    it('manifest.json の lang が "ja" のまま維持されている', () => {
      expect(manifest.lang).toBe("ja");
    });

    it("manifest.json が有効な JSON としてパースできる", () => {
      const content = readFileSync(MANIFEST_PATH, "utf-8");
      expect(() => JSON.parse(content) as unknown).not.toThrow();
    });

    it("sw.js が引き続き存在する", () => {
      expect(existsSync(SW_PATH)).toBe(true);
    });

    it("sw.js が空ファイルでない", () => {
      const { size } = statSync(SW_PATH);
      expect(size).toBeGreaterThan(0);
    });

    it("sw.js の install ハンドラが維持されている", () => {
      const swContent = readFileSync(SW_PATH, "utf-8");
      expect(swContent).toMatch(/addEventListener\s*\(\s*['"]install['"]/);
    });

    it("sw.js の activate ハンドラが維持されている", () => {
      const swContent = readFileSync(SW_PATH, "utf-8");
      expect(swContent).toMatch(/addEventListener\s*\(\s*['"]activate['"]/);
    });

    it("layout.tsx の appleWebApp.capable が true のまま維持されている", () => {
      expect(layoutContent).toMatch(/capable\s*:\s*true/);
    });

    it('layout.tsx の appleWebApp.statusBarStyle が "default" のまま維持されている', () => {
      expect(layoutContent).toMatch(/statusBarStyle\s*:\s*["']default["']/);
    });

    it("layout.tsx の ServiceWorkerRegistrar が引き続き配置されている", () => {
      expect(layoutContent).toMatch(/<ServiceWorkerRegistrar\s*\/>/);
    });

    it('manifest フィールドが "/manifest.json" を指したまま維持されている', () => {
      expect(layoutContent).toMatch(/manifest\s*:\s*["']\/manifest\.json["']/);
    });
  });
});
