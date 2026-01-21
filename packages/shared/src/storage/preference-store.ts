/**
 * @file PreferenceStorageファクトリ
 * @description 環境に応じたPreferenceStorage実装を提供
 * @see specs/004-recommend/004-01-recommend-foundation/004-01-02.md
 */

import type { PreferenceStorage } from "./types";
import { IndexedDBStorage } from "./indexed-db";

/**
 * PreferenceStorageのインスタンスを作成・初期化
 *
 * @returns 初期化済みのPreferenceStorageインスタンス
 * @throws IndexedDBが利用不可能な場合
 *
 * @example
 * ```typescript
 * const storage = await createPreferenceStorage();
 * await storage.saveProfile(profile);
 * ```
 */
export async function createPreferenceStorage(): Promise<PreferenceStorage> {
  const storage = new IndexedDBStorage();
  await storage.initialize();
  return storage;
}
