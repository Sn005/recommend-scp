/**
 * E2Eテスト用シードデータ
 *
 * localStorage シード用のデータとストレージキー定義
 * APIは本番対向で実行するため、APIレスポンスのモックデータは不要
 */

/** ビジターID（オンボーディング完了済み） */
export const mockVisitorOnboarded = {
  visitorId: "e2e00000-0000-4000-a000-000000000001",
};

/** ビジターID（新規、オンボーディング未完了） */
export const mockVisitorNew = {
  visitorId: "e2e00000-0000-4000-a000-000000000002",
};

/** 閲覧履歴エントリ（localStorage用） */
export const mockHistoryEntries = [
  {
    scpNumber: "scp-173",
    title: "彫刻 - オリジナル",
    excerpt: "アイテム番号: SCP-173 オブジェクトクラス: Euclid",
    objectClass: "Euclid",
    viewedAt: "2024-01-15T12:00:00.000Z",
  },
  {
    scpNumber: "scp-049",
    title: "ペスト医師",
    excerpt: "アイテム番号: SCP-049 オブジェクトクラス: Euclid",
    objectClass: "Euclid",
    viewedAt: "2024-01-15T11:00:00.000Z",
  },
];

/** localStorageキー定義 */
export const STORAGE_KEYS = {
  visitorId: "recommend_scp_visitor_id",
  onboardingCompleted: "recommend_scp_onboarding_completed",
  history: "scp-history",
} as const;
