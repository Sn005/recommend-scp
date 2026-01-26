/**
 * @file visitors ドメイン型定義
 * @description visitorsテーブルのドメインモデルとサービスの戻り値型
 * @see specs/005-backend-api/005-03-visitors-api/005-03-01.md
 */

/**
 * Visitor ドメインモデル
 *
 * DBのvisitorsテーブルに対応するcamelCase型。
 */
export interface Visitor {
  /** DB内部ID (UUID) */
  id: string;
  /** クライアント生成UUID */
  visitorId: string;
  /** 作成日時 */
  createdAt: string;
  /** 更新日時 */
  updatedAt: string;
}

/**
 * registerVisitor の戻り値
 */
export interface RegisterVisitorResult {
  /** 登録済みvisitorId */
  visitorId: string;
  /** 新規作成かどうか */
  isNew: boolean;
  /** 作成日時 */
  createdAt: string;
}
