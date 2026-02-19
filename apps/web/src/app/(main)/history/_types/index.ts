/**
 * @file 履歴関連の型定義
 * @description HistoryEntry型を定義
 * @see specs/010-ja-article-display/010-04-history-excerpt/010-04-01.md
 */

// ObjectClass は recommend と共通の型を使用
import type { ObjectClass } from "@/app/(main)/recommend/_types";

export type { ObjectClass };

/**
 * 閲覧履歴エントリ
 *
 * Note: objectClassは推薦APIに含まれていないためオプショナル。
 * 将来的にcontent APIを拡張して取得予定。
 */
export interface HistoryEntry {
  /** SCP番号（例: scp-173） */
  scpNumber: string;
  /** 記事タイトル */
  title: string;
  /** 本文冒頭（最大50文字）@deprecated excerptはカードに表示しない */
  excerpt: string;
  /** オブジェクトクラス（オプショナル） */
  objectClass?: ObjectClass;
  /** 評価スコア（オプショナル） */
  rating?: number | null;
  /** 閲覧日時（ISO 8601形式） */
  viewedAt: string;
}
