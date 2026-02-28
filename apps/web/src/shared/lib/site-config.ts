/**
 * サイト全体の設定
 *
 * SEOメタタグ・sitemap・robots等で使用するサイト基本情報を一元管理。
 * NEXT_PUBLIC_SITE_URL はビルド時にインライン化されるNext.js固有の環境変数。
 *
 * eslint-disable n/no-process-env -- NEXT_PUBLIC_* はNext.jsビルド時にインライン化される
 */

/* eslint-disable n/no-process-env */
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://scpicks.app";
/* eslint-enable n/no-process-env */

export const siteConfig = {
  name: "SCPicks",
  url: SITE_URL,
  description: "あなたの好みに合ったSCP記事をAIが推薦するWebアプリ",
  locale: "ja_JP",
  language: "ja",
} as const;
