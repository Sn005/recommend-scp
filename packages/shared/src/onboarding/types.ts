/**
 * @file オンボーディング型定義
 * @see specs/004-recommend/004-03-onboarding/004-03-01.md
 */

import type { StarterPackType } from "../storage/types";

/**
 * スターターパック定義
 *
 * オンボーディング時にユーザーが選択するスターターパックの詳細情報。
 */
export interface StarterPackDefinition {
  /** パック種別 */
  type: StarterPackType;

  /** 表示名（日本語） */
  displayName: string;

  /** 説明文 */
  description: string;

  /** 主要タグリスト */
  primaryTags: string[];

  /** 代表記事IDリスト */
  seedArticles: string[];
}
