/**
 * PWAスプラッシュスクリーン画像生成スクリプト
 *
 * ブランドカラー（#3B82F6）背景に白いロゴを中央配置したスプラッシュ画像を生成する。
 * 生成先: apps/web/public/splash/
 *
 * 使用方法: pnpm tsx scripts/gen-splash.ts
 */

import { mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** ブランドカラー: #3B82F6（青）/ #FFFFFF（白）*/
const BRAND_COLOR = "#3B82F6";
const PUBLIC_DIR = resolve(__dirname, "../public");
const SPLASH_DIR = resolve(PUBLIC_DIR, "splash");
const ICON_PATH = resolve(PUBLIC_DIR, "icons/icon-512x512.png");

/** デバイスごとのスプラッシュサイズ定義 */
const SPLASH_SIZES = [
  { width: 750, height: 1334, name: "iPhone SE" },
  { width: 1170, height: 2532, name: "iPhone 12/13/14" },
  { width: 1179, height: 2556, name: "iPhone 14 Pro / 15 Pro" },
  { width: 1290, height: 2796, name: "iPhone 14 Pro Max / 15 Pro Max" },
  { width: 1640, height: 2360, name: "iPad (10th gen)" },
  { width: 1668, height: 2388, name: 'iPad Pro 11"' },
  { width: 2048, height: 2732, name: 'iPad Pro 12.9"' },
] as const;

async function generateSplash(): Promise<void> {
  mkdirSync(SPLASH_DIR, { recursive: true });

  const iconBuffer = readFileSync(ICON_PATH);

  for (const size of SPLASH_SIZES) {
    const iconSize = Math.round(Math.min(size.width, size.height) * 0.25);

    const resizedIcon = await sharp(iconBuffer)
      .resize(iconSize, iconSize, { fit: "contain", background: BRAND_COLOR })
      .png()
      .toBuffer();

    const left = Math.round((size.width - iconSize) / 2);
    const top = Math.round((size.height - iconSize) / 2);

    const filename = `splash-${String(size.width)}x${String(size.height)}.png`;

    await sharp({
      create: {
        width: size.width,
        height: size.height,
        channels: 3,
        background: BRAND_COLOR,
      },
    })
      .composite([{ input: resizedIcon, left, top }])
      .png()
      .toFile(resolve(SPLASH_DIR, filename));

    console.log(`生成完了: ${filename} (${size.name})`);
  }

  console.log(`\n全${String(SPLASH_SIZES.length)}件のスプラッシュ画像を生成しました。`);
}

generateSplash().catch((error: unknown) => {
  console.error("スプラッシュ画像の生成に失敗しました:", error);
  process.exit(1);
});
