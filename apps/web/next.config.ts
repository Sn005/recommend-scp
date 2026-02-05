import type { NextConfig } from "next";

/**
 * Wikidotリソースのプロキシ先ドメイン
 * scp-jp.wikidot.comはHTTPSに対応していないため、
 * Next.js rewritesでHTTPコンテンツをHTTPS経由で配信する
 */
const WIKIDOT_ORIGIN = "http://scp-jp.wikidot.com";

/**
 * Wikidotが使用するリソースパスのプレフィックス一覧
 * ダブルダッシュ(--) はWikidot固有のURL規約で、アプリのルートとは衝突しない
 */
const WIKIDOT_RESOURCE_PREFIXES = [
  "common--theme", // ベーステーマCSS/JS
  "common--javascript", // 共通JavaScript
  "common--modules", // モジュールJS/CSS
  "local--code", // サイト固有CSS/JS
  "local--files", // アップロードファイル（画像等）
  "local--theme", // サイト固有テーマ
];

const nextConfig: NextConfig = {
  // トランスパイル対象パッケージ（モノレポ内部パッケージ）
  transpilePackages: [
    "@recommend-scp/api-types",
    "@recommend-scp/api-server",
    "@recommend-scp/shared",
  ],

  // SCP Wiki (HTTP) へのリバースプロキシ
  // HTTPS環境でiframeにHTTPコンテンツを表示するためのmixed content回避策
  async rewrites() {
    return [
      // 記事ページ本体
      {
        source: "/wiki/:path*",
        destination: `${WIKIDOT_ORIGIN}/:path*`,
      },
      // Wikidot静的リソース（CSS/JS/画像等）
      // iframeで読み込まれたHTMLから絶対パスで参照されるリソースをプロキシ
      ...WIKIDOT_RESOURCE_PREFIXES.map((prefix) => ({
        source: `/${prefix}/:path*`,
        destination: `${WIKIDOT_ORIGIN}/${prefix}/:path*`,
      })),
    ];
  },
};

export default nextConfig;
