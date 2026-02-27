// Workbox CDN読み込み（ビルドステップ不要）
importScripts("https://storage.googleapis.com/workbox-cdn/releases/7.3.0/workbox-sw.js");

// ============================================================
// Workbox設定
// ============================================================
workbox.setConfig({ debug: false });

const { registerRoute } = workbox.routing;
const { StaleWhileRevalidate, CacheFirst, NetworkOnly } = workbox.strategies;
const { ExpirationPlugin } = workbox.expiration;
const { CacheableResponsePlugin } = workbox.cacheableResponse;

// ============================================================
// 定数
// ============================================================
const ARTICLE_CACHE_NAME = "scp-articles-v1";
const SUB_RESOURCE_CACHE_NAME = "scp-sub-resources-v1";
const SUB_RESOURCE_PREFIXES = ["/wdfiles-", "/wikidot-", "/common--", "/local--"];

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
// その他のリクエスト: Network passthrough
// ============================================================
registerRoute(({ url }) => url.origin === self.location.origin, new NetworkOnly());

// ============================================================
// Install: 即座にアクティベート
// ============================================================
self.addEventListener("install", () => {
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
        const expected = new Set([ARTICLE_CACHE_NAME, SUB_RESOURCE_CACHE_NAME]);
        return Promise.all(
          names.filter((n) => n.startsWith("scp-") && !expected.has(n)).map((n) => caches.delete(n))
        );
      }),
    ])
  );
});
