/**
 * @file スターターパック定義
 * @see specs/004-recommend/004-03-onboarding/004-03-01.md
 */

import type { StarterPackType } from "../storage/types";
import type { StarterPackDefinition } from "./types";

/**
 * スターターパック種別一覧
 */
export const STARTER_PACK_TYPES: StarterPackType[] = [
  "horror",
  "surreal",
  "scientific",
  "heartwarming",
  "mystery",
  "custom",
];

/**
 * スターターパック定義
 *
 * customを除く5種類のパック定義。
 */
export const STARTER_PACKS: Record<Exclude<StarterPackType, "custom">, StarterPackDefinition> = {
  horror: {
    type: "horror",
    displayName: "ホラー好き",
    description: "背筋が凍るような恐怖体験を求めるあなたへ",
    primaryTags: ["horror", "creepy", "keter", "euclid"],
    seedArticles: ["scp-087", "scp-106", "scp-096"],
  },
  surreal: {
    type: "surreal",
    displayName: "シュール好き",
    description: "不思議で奇妙な世界観を楽しみたいあなたへ",
    primaryTags: ["surreal", "humorous", "joke", "absurd"],
    seedArticles: ["scp-426", "scp-999", "scp-2337"],
  },
  scientific: {
    type: "scientific",
    displayName: "科学・SF好き",
    description: "科学的な考察やSF要素を楽しみたいあなたへ",
    primaryTags: ["scientific", "technological", "extraterrestrial"],
    seedArticles: ["scp-914", "scp-2000", "scp-3000"],
  },
  heartwarming: {
    type: "heartwarming",
    displayName: "ほのぼの好き",
    description: "心温まる優しい異常存在を探しているあなたへ",
    primaryTags: ["heartwarming", "safe", "friendly"],
    seedArticles: ["scp-999", "scp-131", "scp-529"],
  },
  mystery: {
    type: "mystery",
    displayName: "謎解き好き",
    description: "複雑な謎や考察を楽しみたいあなたへ",
    primaryTags: ["mystery", "puzzle", "meta"],
    seedArticles: ["scp-001", "scp-055", "scp-2521"],
  },
};

/**
 * スターターパック一覧を取得
 *
 * @returns 5種類のスターターパック定義の配列
 */
export function getStarterPackList(): StarterPackDefinition[] {
  return Object.values(STARTER_PACKS);
}

/**
 * 指定タイプのスターターパックを取得
 *
 * @param type パック種別
 * @returns パック定義。customまたは存在しないタイプの場合はnull
 */
export function getStarterPack(type: StarterPackType): StarterPackDefinition | null {
  if (type === "custom") return null;
  return STARTER_PACKS[type] ?? null;
}
