/**
 * @file 閲覧履歴の型定義
 * @description /history ページで使用する型
 * @see specs/010-ja-article-display/010-04-history-excerpt/010-04-01.md
 */

/** オブジェクトクラス */
export type ObjectClass = "Safe" | "Euclid" | "Keter" | "Thaumiel" | "Neutralized";

/** 閲覧履歴エントリ */
export interface HistoryEntry {
  /** SCP番号 (例: "SCP-173") */
  scpNumber: string;
  /** 記事タイトル */
  title: string;
  /** 本文冒頭（excerptフィールド） */
  excerpt: string;
  /** オブジェクトクラス */
  objectClass: ObjectClass;
  /** 閲覧日時（ISO 8601形式） */
  viewedAt: string;
}
