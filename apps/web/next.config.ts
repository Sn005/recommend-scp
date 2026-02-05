import type { NextConfig } from "next";

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
      {
        source: "/wiki/:path*",
        destination: "http://scp-jp.wikidot.com/:path*",
      },
    ];
  },
};

export default nextConfig;
