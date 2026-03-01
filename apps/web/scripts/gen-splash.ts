/**
 * PWAスプラッシュスクリーン画像生成スクリプト
 *
 * アイコン背景色（#FFFFFF）に合わせた白背景に、
 * ブランドカラー（#3B82F6）で「SCPicks」テキストを中央配置したスプラッシュ画像を生成する。
 * 生成先: apps/web/public/splash/
 *
 * 使用方法: pnpm tsx scripts/gen-splash.ts
 */

import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** ブランドカラー: #3B82F6（青）/ #FFFFFF（白）*/
const BRAND_BLUE = "#3B82F6";
const BACKGROUND_COLOR = "#FFFFFF";
const PUBLIC_DIR = resolve(__dirname, "../public");
const SPLASH_DIR = resolve(PUBLIC_DIR, "splash");

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

/** SVGテキスト画像を生成する */
function createTextSvg(width: number, height: number): Buffer {
  const fontSize = Math.round(Math.min(width, height) * 0.08);
  const svg = `<svg width="${String(width)}" height="${String(height)}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${BACKGROUND_COLOR}"/>
  <text
    x="50%" y="50%"
    font-family="system-ui, -apple-system, 'Helvetica Neue', Arial, sans-serif"
    font-size="${String(fontSize)}"
    font-weight="700"
    fill="${BRAND_BLUE}"
    text-anchor="middle"
    dominant-baseline="central"
  >SCPicks</text>
</svg>`;
  return Buffer.from(svg);
}

async function generateSplash(): Promise<void> {
  mkdirSync(SPLASH_DIR, { recursive: true });

  for (const size of SPLASH_SIZES) {
    const filename = `splash-${String(size.width)}x${String(size.height)}.png`;
    const svgBuffer = createTextSvg(size.width, size.height);

    await sharp(svgBuffer).png().toFile(resolve(SPLASH_DIR, filename));

    console.log(`生成完了: ${filename} (${size.name})`);
  }

  console.log(`\n全${String(SPLASH_SIZES.length)}件のスプラッシュ画像を生成しました。`);
}

generateSplash().catch((error: unknown) => {
  console.error("スプラッシュ画像の生成に失敗しました:", error);
  process.exit(1);
});
