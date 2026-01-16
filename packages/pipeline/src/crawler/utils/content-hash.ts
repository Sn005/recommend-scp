/**
 * コンテンツハッシュ計算ユーティリティ
 * Subtask: 003-02-03
 */

import { createHash } from "crypto";

/**
 * コンテンツからSHA-256ハッシュを計算
 * @param content ハッシュ計算対象のコンテンツ
 * @returns 64文字の16進数文字列
 */
export const computeContentHash = (content: string): string => {
  return createHash("sha256").update(content, "utf8").digest("hex");
};
