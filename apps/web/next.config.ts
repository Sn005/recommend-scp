import type { NextConfig } from "next";

/**
 * Wikidot関連ドメインのHTTPオリジン
 * いずれもHTTPSに対応していないため、Next.js rewritesでプロキシする
 */
const WIKIDOT_ORIGINS = {
  main: "http://scp-jp.wikidot.com",
  wdfiles: "http://scp-jp.wdfiles.com",
  wdfilesStorage: "http://scp-jp-storage.wdfiles.com",
  wdfilesStatic: "http://static.wdfiles.com",
  wdfilesStaticL: "http://static-l.wdfiles.com",
  wikidotWww: "http://www.wikidot.com",
  wikidotStatic: "http://static.wikidot.com",
} as const;

/**
 * Wikidotが使用するリソースパスのプレフィックス一覧
 * ダブルダッシュ(--) はWikidot固有のURL規約で、アプリのルートとは衝突しない
 */
const WIKIDOT_RESOURCE_PREFIXES = [
  "common--theme", // ベーステーマCSS/JS
  "common--javascript", // 共通JavaScript
  "common--modules", // モジュールJS/CSS
  "common--bootstrap", // Bootstrap CSS/JS
  "common--fonts", // Font Awesome等
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
  //
  // 構成:
  //   /api/wiki-proxy/* → Honoエンドポイント（HTML取得 + URL書き換え）
  //   /wiki/*           → scp-jp.wikidot.com（HTML内から参照される記事リンク等）
  //   /wdfiles-*        → *.wdfiles.com（画像・CSS等のファイルストレージ）
  //   /wikidot-www/*    → www.wikidot.com（共通リソース）
  //   /common--*等      → scp-jp.wikidot.com（絶対パスで参照される静的リソース）
  rewrites() {
    return [
      // 記事ページ（HTML内リンクのフォールバック）
      {
        source: "/wiki/:path*",
        destination: `${WIKIDOT_ORIGINS.main}/:path*`,
      },
      // wdfiles.com ファイルストレージ（CSS/画像/カスタムテーマ）
      {
        source: "/wdfiles-scp-jp/:path*",
        destination: `${WIKIDOT_ORIGINS.wdfiles}/:path*`,
      },
      {
        source: "/wdfiles-scp-jp-storage/:path*",
        destination: `${WIKIDOT_ORIGINS.wdfilesStorage}/:path*`,
      },
      // static.wdfiles.com プラットフォームテーマCSS
      {
        source: "/wdfiles-static/:path*",
        destination: `${WIKIDOT_ORIGINS.wdfilesStatic}/:path*`,
      },
      // static-l.wdfiles.com プラットフォームテーマCSS（ロードバランサ）
      {
        source: "/wdfiles-static-l/:path*",
        destination: `${WIKIDOT_ORIGINS.wdfilesStaticL}/:path*`,
      },
      // www.wikidot.com 共通リソース
      {
        source: "/wikidot-www/:path*",
        destination: `${WIKIDOT_ORIGINS.wikidotWww}/:path*`,
      },
      // static.wikidot.com プラットフォーム静的リソース
      {
        source: "/wikidot-static/:path*",
        destination: `${WIKIDOT_ORIGINS.wikidotStatic}/:path*`,
      },
      // Wikidot静的リソース（絶対パスで参照されるCSS/JS/画像等）
      ...WIKIDOT_RESOURCE_PREFIXES.map((prefix) => ({
        source: `/${prefix}/:path*`,
        destination: `${WIKIDOT_ORIGINS.main}/${prefix}/:path*`,
      })),
    ];
  },
};

export default nextConfig;
