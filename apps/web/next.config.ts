import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // トランスパイル対象パッケージ（モノレポ内部パッケージ）
  transpilePackages: ["@recommend-scp/api-types", "@recommend-scp/shared"],
};

export default nextConfig;
