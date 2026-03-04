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
  });

  describe("Workboxキャッシュ機能の存在確認", () => {
    it("Workboxがimportされている", () => {
      expect(swContent).toContain("importScripts");
      expect(swContent).toContain("workbox-sw.js");
    });

    it("キャッシュ名 scp-articles-v1 が定義されている", () => {
      expect(swContent).toContain("scp-articles-v1");
    });

    it("キャッシュ名 scp-sub-resources-v1 が定義されている", () => {
      expect(swContent).toContain("scp-sub-resources-v1");
    });

    it("StaleWhileRevalidate戦略が設定されている", () => {
      expect(swContent).toContain("StaleWhileRevalidate");
    });

    it("CacheFirst戦略が設定されている", () => {
      expect(swContent).toContain("CacheFirst");
    });

    it("/api/wiki-proxy/ パスの判定が存在する", () => {
      expect(swContent).toContain("/api/wiki-proxy/");
    });

    it("サブリソースのパスプレフィックスが定義されている", () => {
      expect(swContent).toContain("/wdfiles-");
      expect(swContent).toContain("/wikidot-");
      expect(swContent).toContain("/common--");
      expect(swContent).toContain("/local--");
    });

    it("3ヶ月の有効期限が設定されている", () => {
      expect(swContent).toMatch(/90\s*\*\s*24\s*\*\s*60\s*\*\s*60/);
    });

    it("purgeOnQuotaErrorが有効である", () => {
      expect(swContent).toContain("purgeOnQuotaError: true");
    });

    it("古いキャッシュの削除ロジックが存在する", () => {
      expect(swContent).toMatch(/caches\.keys/);
      expect(swContent).toMatch(/caches\.delete/);
    });

    it("200レスポンスのみキャッシュするCacheableResponsePluginが設定されている", () => {
      expect(swContent).toContain("CacheableResponsePlugin");
      expect(swContent).toContain("statuses");
    });

    it("ExpirationPluginが設定されている", () => {
      expect(swContent).toContain("ExpirationPlugin");
    });

    it("NetworkFirst戦略が設定されている", () => {
      expect(swContent).toContain("NetworkFirst");
    });

    it("キャッシュ名 next-static-v1 が定義されている", () => {
      expect(swContent).toContain("next-static-v1");
    });

    it("キャッシュ名 next-pages-v1 が定義されている", () => {
      expect(swContent).toContain("next-pages-v1");
    });

    it("キャッシュ名 scp-article-meta-v1 が定義されている", () => {
      expect(swContent).toContain("scp-article-meta-v1");
    });

    it("キャッシュ名 scp-favorites-api-v1 が定義されている", () => {
      expect(swContent).toContain("scp-favorites-api-v1");
    });

    it("/_next/static/ パスの判定が存在する", () => {
      expect(swContent).toContain("/_next/static/");
    });

    it("/article/ パスの判定が存在する", () => {
      expect(swContent).toContain("/article/");
    });

    it("/favorites パスの判定が存在する", () => {
      expect(swContent).toContain("/favorites");
    });

    it("/history パスの判定が存在する", () => {
      expect(swContent).toContain("/history");
    });

    it("/api/favorites パスの判定が存在する", () => {
      expect(swContent).toContain("/api/favorites");
    });

    it("オフライン対応ページプレフィックスが定義されている", () => {
      expect(swContent).toContain("OFFLINE_PAGE_PREFIXES");
    });

    it("/api/articles/ のコンテンツAPIパスの判定が存在する", () => {
      expect(swContent).toMatch(/\\\/api\\\/articles\\\/.*\\\/content/);
    });

    it("7日の有効期限が設定されている（ページキャッシュ用）", () => {
      expect(swContent).toMatch(/7\s*\*\s*24\s*\*\s*60\s*\*\s*60/);
    });

    it("networkTimeoutSecondsが設定されている", () => {
      expect(swContent).toContain("networkTimeoutSeconds");
    });

    it("古いキャッシュ削除がnext-プレフィックスにも対応している", () => {
      expect(swContent).toContain('n.startsWith("next-")');
    });
  });

  describe("RSCキャッシュキー分離とアプリシェルフォールバック", () => {
    it("RSCキャッシュキー分離プラグインが定義されている", () => {
      expect(swContent).toContain("rscCacheKeyPlugin");
    });

    it("RSCヘッダーによるキャッシュキー分岐が実装されている", () => {
      expect(swContent).toContain('request.headers.get("RSC")');
      expect(swContent).toContain("_rsc");
    });

    it("cacheKeyWillBeUsedフックが定義されている", () => {
      expect(swContent).toContain("cacheKeyWillBeUsed");
    });

    it("アプリシェルURLが定義されている", () => {
      expect(swContent).toContain("APP_SHELL_URL");
      expect(swContent).toContain("/recommend");
    });

    it("setCatchHandlerでナビゲーションフォールバックが設定されている", () => {
      expect(swContent).toContain("setCatchHandler");
    });

    it("installイベントでアプリシェルをプリキャッシュしている", () => {
      expect(swContent).toContain("cache.add(APP_SHELL_URL)");
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
