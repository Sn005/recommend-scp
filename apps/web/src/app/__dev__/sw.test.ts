import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const SW_PATH = resolve(__dirname, "../../../public/sw.js");
const LAYOUT_PATH = resolve(__dirname, "../layout.tsx");

describe("sw.js", () => {
  let swContent: string;

  beforeAll(() => {
    swContent = readFileSync(SW_PATH, "utf-8");
  });

  describe("AC-1: sw.js ファイルの配置と内容", () => {
    it("sw.js ファイルが public/ に存在する", () => {
      expect(existsSync(SW_PATH)).toBe(true);
    });

    it("sw.js が空ファイルでない", () => {
      expect(swContent.trim().length).toBeGreaterThan(0);
    });

    it("install イベントハンドラが登録されている", () => {
      expect(swContent).toMatch(/addEventListener\s*\(\s*['"]install['"]/);
    });

    it("install ハンドラ内で skipWaiting() が呼ばれている", () => {
      expect(swContent).toContain("skipWaiting()");
    });

    it("activate イベントハンドラが登録されている", () => {
      expect(swContent).toMatch(/addEventListener\s*\(\s*['"]activate['"]/);
    });

    it("activate ハンドラ内で clients.claim() が呼ばれている", () => {
      expect(swContent).toContain("clients.claim()");
    });

    it("fetch イベントハンドラが登録されている", () => {
      expect(swContent).toMatch(/addEventListener\s*\(\s*['"]fetch['"]/);
    });

    it("HTTPスキームのリクエストが fetch(event.request) される", () => {
      expect(swContent).toMatch(/fetch\s*\(\s*event\.request\s*\)/);
    });

    it("HTTPスキームのチェックが行われている", () => {
      expect(swContent).toMatch(/startsWith\s*\(\s*['"]http/);
    });

    it("キャッシュ操作（caches.open 等）が行われていない", () => {
      expect(swContent).not.toMatch(/caches\.(open|put|match)/);
    });
  });
});

describe("layout.tsx への ServiceWorkerRegistrar 配置", () => {
  let layoutContent: string;

  beforeAll(() => {
    layoutContent = readFileSync(LAYOUT_PATH, "utf-8");
  });

  describe("AC-4: ServiceWorkerRegistrar の配置", () => {
    it("ServiceWorkerRegistrar が import されている", () => {
      expect(layoutContent).toMatch(/import.*ServiceWorkerRegistrar/);
    });

    it("ServiceWorkerRegistrar が JSX として body 内で使用されている", () => {
      expect(layoutContent).toMatch(/<ServiceWorkerRegistrar\s*\/?>/);
    });
  });
});
