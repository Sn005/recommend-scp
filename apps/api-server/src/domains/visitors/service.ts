/**
 * @file VisitorsService
 * @description visitorsドメインのビジネスロジック層
 * @see specs/005-backend-api/005-03-visitors-api/005-03-01.md
 */

import type { PreferenceStorage } from "@recommend-scp/shared/storage/server";
import type { VisitorsRepository } from "./repository";
import type { RegisterVisitorResult } from "./types";
import { NotFoundError } from "../../lib/errors";

/** Supabase UNIQUE制約違反エラーコード */
const UNIQUE_VIOLATION_CODE = "23505";

/**
 * エラーがUNIQUE制約違反かどうかを判定
 */
const isUniqueViolationError = (error: unknown): boolean => {
  if (typeof error === "object" && error !== null && "code" in error) {
    return (error as { code: string }).code === UNIQUE_VIOLATION_CODE;
  }
  return false;
};

/**
 * VisitorsService
 *
 * visitorの登録・取得に関するビジネスロジックを提供。
 * レースコンディション対策としてUNIQUE制約違反時のリトライを実装。
 */
export class VisitorsService {
  constructor(
    private readonly repository: VisitorsRepository,
    private readonly storage?: PreferenceStorage
  ) {}

  /**
   * visitorを登録または既存取得
   *
   * 1. まずfindByVisitorIdで既存チェック
   * 2. 存在すればそのまま返す（isNew: false）
   * 3. 存在しなければcreateで新規作成（isNew: true）
   * 4. レースコンディションでUNIQUE制約違反が発生した場合は再度findを実行
   *
   * @param visitorId - クライアント生成UUID
   * @returns RegisterVisitorResult
   */
  registerVisitor = async (visitorId: string): Promise<RegisterVisitorResult> => {
    // 既存チェック
    const existing = await this.repository.findByVisitorId(visitorId);

    if (existing) {
      return {
        visitorId: existing.visitorId,
        isNew: false,
        createdAt: existing.createdAt,
      };
    }

    // 新規作成
    try {
      const created = await this.repository.create(visitorId);
      return {
        visitorId: created.visitorId,
        isNew: true,
        createdAt: created.createdAt,
      };
    } catch (error) {
      // レースコンディション対策: UNIQUE制約違反時は再度findを実行
      if (isUniqueViolationError(error)) {
        const retryFind = await this.repository.findByVisitorId(visitorId);
        if (retryFind) {
          return {
            visitorId: retryFind.visitorId,
            isNew: false,
            createdAt: retryFind.createdAt,
          };
        }
        // 再findでも見つからない場合は異常状態
        throw new Error("UNIQUE制約違反後にvisitorが見つかりません");
      }

      // その他のエラーは伝播
      throw error;
    }
  };

  /**
   * 嗜好データをリセット
   *
   * 1. visitorIdの存在確認
   * 2. PreferenceStorage.resetPreference() 呼び出し
   *
   * @param visitorId - 訪問者UUID
   * @throws NotFoundError visitorが存在しない場合
   */
  resetPreference = async (visitorId: string): Promise<void> => {
    const exists = await this.repository.existsByVisitorId(visitorId);
    if (!exists) {
      throw new NotFoundError("Visitor", visitorId);
    }
    if (!this.storage) {
      throw new Error("PreferenceStorage is not configured");
    }
    await this.storage.resetPreference(visitorId);
  };
}
