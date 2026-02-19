/**
 * E2Eテスト用モックデータ
 *
 * Playwright E2Eテストで使用するAPIレスポンスとlocalStorageデータの定義
 */

/** モック: POST /visitors レスポンス（オンボーディング完了済み） */
export const mockVisitorOnboarded = {
  visitorId: "e2e-test-visitor-001",
  isNew: false,
  createdAt: "2024-01-01T00:00:00.000Z",
  onboardingCompletedAt: "2024-01-01T00:00:00.000Z",
};

/** モック: POST /recommend レスポンス */
export const mockRecommendResponse = {
  recommendations: [
    {
      id: "scp-173",
      title: "彫刻 - オリジナル",
      similarityScore: 0.95,
      source: "preference" as const,
      url: "/wiki/scp-173",
      objectClass: "Euclid",
      rating: 1200,
    },
    {
      id: "scp-049",
      title: "ペスト医師",
      similarityScore: 0.9,
      source: "preference" as const,
      url: "/wiki/scp-049",
      objectClass: "Euclid",
      rating: 980,
    },
    {
      id: "scp-096",
      title: "シャイガイ",
      similarityScore: 0.85,
      source: "serendipity" as const,
      url: "/wiki/scp-096",
      objectClass: "Euclid",
      rating: 1100,
    },
  ],
  count: 3,
  hasMore: true,
};

/** モック: GET /favorites レスポンス */
export const mockFavoritesResponse = {
  favorites: [
    {
      id: "fav-001",
      articleId: "scp-173",
      title: "彫刻 - オリジナル",
      excerpt: "アイテム番号: SCP-173 オブジェクトクラス: Euclid 特別収容プロトコル...",
      objectClass: "Euclid",
      rating: 1200,
      favoritedAt: "2024-01-15T10:00:00.000Z",
    },
    {
      id: "fav-002",
      articleId: "scp-049",
      title: "ペスト医師",
      excerpt: "アイテム番号: SCP-049 オブジェクトクラス: Euclid 特別収容プロトコル...",
      objectClass: "Euclid",
      rating: 980,
      favoritedAt: "2024-01-14T10:00:00.000Z",
    },
  ],
  total: 2,
};

/** モック: 閲覧履歴エントリ（localStorage用） */
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
