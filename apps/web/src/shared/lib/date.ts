/**
 * @file 日付ユーティリティ
 * @description 日付フォーマット関連のユーティリティ関数
 */

/**
 * 相対時間をフォーマットする
 *
 * @param dateString - ISO 8601形式の日時文字列
 * @param now - 比較基準となる現在時刻（デフォルト: new Date()）
 * @returns 相対時間文字列（例: "2時間前", "3日前"）
 *
 * @example
 * ```ts
 * formatRelativeTime("2024-01-15T10:00:00.000Z"); // "2時間前"
 * // テスト時に現在時刻を固定
 * formatRelativeTime("2024-01-15T10:00:00.000Z", new Date("2024-01-15T12:00:00.000Z")); // "2時間前"
 * ```
 */
export function formatRelativeTime(dateString: string, now: Date = new Date()): string {
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  if (diffSec < 60) {
    return "たった今";
  }
  if (diffMin < 60) {
    return `${String(diffMin)}分前`;
  }
  if (diffHour < 24) {
    return `${String(diffHour)}時間前`;
  }
  if (diffDay < 7) {
    return `${String(diffDay)}日前`;
  }
  if (diffWeek < 4) {
    return `${String(diffWeek)}週間前`;
  }
  if (diffMonth < 12) {
    return `${String(diffMonth)}ヶ月前`;
  }
  return `${String(diffYear)}年前`;
}
