// Workbox CDN読み込み（ビルドステップ不要）
importScripts("https://storage.googleapis.com/workbox-cdn/releases/7.3.0/workbox-sw.js");

// ============================================================
// Workbox設定
// ============================================================
workbox.setConfig({ debug: false });

const { registerRoute, setCatchHandler } = workbox.routing;
const { StaleWhileRevalidate, CacheFirst, NetworkFirst, NetworkOnly } = workbox.strategies;
const { ExpirationPlugin } = workbox.expiration;
const { CacheableResponsePlugin } = workbox.cacheableResponse;

// ============================================================
// 定数
// ============================================================
const ARTICLE_CACHE_NAME = "scp-articles-v1";
const SUB_RESOURCE_CACHE_NAME = "scp-sub-resources-v1";
const ARTICLE_META_CACHE_NAME = "scp-article-meta-v1";
const FAVORITES_API_CACHE_NAME = "scp-favorites-api-v1";
const NEXT_STATIC_CACHE_NAME = "next-static-v1";
const NEXT_PAGES_CACHE_NAME = "next-pages-v1";
const SUB_RESOURCE_PREFIXES = ["/wdfiles-", "/wikidot-", "/common--", "/local--"];
const OFFLINE_PAGE_PREFIXES = ["/article/", "/favorites", "/history"];
const APP_SHELL_URL = "/recommend";

// ============================================================
// RSCキャッシュキー分離プラグイン
// Next.js App Routerのクライアントサイド遷移（RSCペイロード）と
// フルページナビゲーション（HTML）を別々にキャッシュする
// ============================================================
const rscCacheKeyPlugin = {
  cacheKeyWillBeUsed: async ({ request }) => {
    const url = new URL(request.url);
    if (request.headers.get("RSC") === "1") {
      url.searchParams.set("_rsc", "1");
    }
    return url.toString();
  },
};

// ============================================================
// 記事HTML: Stale-While-Revalidate（即時表示＋バックグラウンド更新）
// ============================================================
registerRoute(
  ({ url }) => url.origin === self.location.origin && url.pathname.startsWith("/api/wiki-proxy/"),
  new StaleWhileRevalidate({
    cacheName: ARTICLE_CACHE_NAME,
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({
        maxAgeSeconds: 90 * 24 * 60 * 60, // 3ヶ月
        purgeOnQuotaError: true,
      }),
    ],
  })
);

// ============================================================
// サブリソース: Cache-first（CSS/画像/JSは変更頻度が低い）
// ============================================================
registerRoute(
  ({ url }) =>
    url.origin === self.location.origin &&
    SUB_RESOURCE_PREFIXES.some((prefix) => url.pathname.startsWith(prefix)),
  new CacheFirst({
    cacheName: SUB_RESOURCE_CACHE_NAME,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({
        maxAgeSeconds: 30 * 24 * 60 * 60, // 30日
        purgeOnQuotaError: true,
      }),
    ],
  })
);

// ============================================================
// Next.js 静的アセット: Cache-first（ファイル名にハッシュ含む＝不変）
// ============================================================
registerRoute(
  ({ url }) => url.origin === self.location.origin && url.pathname.startsWith("/_next/static/"),
  new CacheFirst({
    cacheName: NEXT_STATIC_CACHE_NAME,
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({
        maxAgeSeconds: 365 * 24 * 60 * 60, // 1年（ハッシュ付きなので長期OK）
        maxEntries: 200,
        purgeOnQuotaError: true,
      }),
    ],
  })
);

// ============================================================
// 記事メタデータAPI: Stale-While-Revalidate（オフラインでも著者情報表示）
// ============================================================
registerRoute(
  ({ url }) =>
    url.origin === self.location.origin && /^\/api\/articles\/[^/]+\/content$/.test(url.pathname),
  new StaleWhileRevalidate({
    cacheName: ARTICLE_META_CACHE_NAME,
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({
        maxAgeSeconds: 90 * 24 * 60 * 60, // 3ヶ月（記事キャッシュと同期）
        purgeOnQuotaError: true,
      }),
    ],
  })
);

// ============================================================
// お気に入りAPI: Stale-While-Revalidate（オフラインでもお気に入り一覧表示）
// ============================================================
registerRoute(
  ({ url }) => url.origin === self.location.origin && url.pathname.startsWith("/api/favorites"),
  new StaleWhileRevalidate({
    cacheName: FAVORITES_API_CACHE_NAME,
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7日
        purgeOnQuotaError: true,
      }),
    ],
  })
);

// ============================================================
// オフライン対応ページ: Network-first
// 対象: /article/*, /favorites, /history
// フルナビゲーション(HTML)とクライアントサイド遷移(RSC)の両方をキャッシュ
// rscCacheKeyPluginにより異なるキャッシュキーで保存
// ============================================================
registerRoute(
  ({ url }) =>
    url.origin === self.location.origin &&
    OFFLINE_PAGE_PREFIXES.some((prefix) => url.pathname.startsWith(prefix)),
  new NetworkFirst({
    cacheName: NEXT_PAGES_CACHE_NAME,
    plugins: [
      rscCacheKeyPlugin,
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7日（デプロイ後に古いHTMLは不要）
        maxEntries: 100,
        purgeOnQuotaError: true,
      }),
    ],
    networkTimeoutSeconds: 3,
  })
);

// ============================================================
// その他のリクエスト: Network passthrough
// ============================================================
registerRoute(({ url }) => url.origin === self.location.origin, new NetworkOnly());

// ============================================================
// Navigateフォールバック: オフライン時にHTMLキャッシュがないページへの
// フルナビゲーションをキャッシュ済みアプリシェルで代替
// Next.jsクライアントルーターがURLを解釈し、キャッシュ済みRSCデータで描画
// ============================================================
setCatchHandler(async ({ event }) => {
  if (event.request.mode === "navigate") {
    const cache = await caches.open(NEXT_PAGES_CACHE_NAME);
    const cached = await cache.match(APP_SHELL_URL);
    if (cached) return cached;
  }
  return Response.error();
});

// ============================================================
// Install: アプリシェルをプリキャッシュ＋即座にアクティベート
// ============================================================
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(NEXT_PAGES_CACHE_NAME).then((cache) => cache.add(APP_SHELL_URL)));
  self.skipWaiting();
});

// ============================================================
// Activate: 古いキャッシュの削除＋全クライアント制御
// ============================================================
self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((names) => {
        const expected = new Set([
          ARTICLE_CACHE_NAME,
          SUB_RESOURCE_CACHE_NAME,
          ARTICLE_META_CACHE_NAME,
          FAVORITES_API_CACHE_NAME,
          NEXT_STATIC_CACHE_NAME,
          NEXT_PAGES_CACHE_NAME,
        ]);
        return Promise.all(
          names
            .filter((n) => (n.startsWith("scp-") || n.startsWith("next-")) && !expected.has(n))
            .map((n) => caches.delete(n))
        );
      }),
    ])
  );
});
