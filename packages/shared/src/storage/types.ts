/**
 * @file ストレージ抽象化レイヤー型定義
 * @description 推薦ロジックで使用するストレージの抽象化レイヤー
 * @see specs/004-recommend/004-01-recommend-foundation/004-01-01.md
 */

/**
 * ストレージ抽象化インターフェース
 *
 * 推薦ロジックで使用するストレージ操作を抽象化し、
 * 具体的なストレージ実装（IndexedDB等）に依存しない設計を実現する。
 */
export interface PreferenceStorage {
  /**
   * 嗜好プロファイルを取得
   * @param visitorId 訪問者ID
   * @returns 嗜好プロファイル。存在しない場合はnull
   */
  getProfile(visitorId: string): Promise<PreferenceProfile | null>;

  /**
   * 嗜好プロファイルを保存
   * @param profile 保存する嗜好プロファイル
   */
  saveProfile(profile: PreferenceProfile): Promise<void>;

  /**
   * 閲覧履歴を取得
   * @param visitorId 訪問者ID
   * @param limit 取得件数上限（省略時は全件）
   * @returns 閲覧履歴の配列
   */
  getViewHistory(visitorId: string, limit?: number): Promise<ViewHistory[]>;

  /**
   * 閲覧履歴を追加
   * @param history 追加する閲覧履歴
   */
  addViewHistory(history: ViewHistory): Promise<void>;

  /**
   * フィードバック一覧を取得
   * @param visitorId 訪問者ID
   * @returns フィードバックの配列
   */
  getFeedback(visitorId: string): Promise<Feedback[]>;

  /**
   * 特定記事へのフィードバックを取得
   * @param visitorId 訪問者ID
   * @param articleId 記事ID
   * @returns フィードバック。存在しない場合はnull
   */
  getFeedbackByArticle(visitorId: string, articleId: string): Promise<Feedback | null>;

  /**
   * フィードバックを追加
   * @param feedback 追加するフィードバック
   */
  addFeedback(feedback: Feedback): Promise<void>;

  /**
   * 推薦ログを取得
   * @param visitorId 訪問者ID
   * @param limit 取得件数上限（省略時は全件）
   * @returns 推薦ログの配列
   */
  getRecommendationLog(visitorId: string, limit?: number): Promise<RecommendationLog[]>;

  /**
   * 推薦ログを追加
   * @param log 追加する推薦ログ
   */
  addRecommendationLog(log: RecommendationLog): Promise<void>;

  /**
   * 記事のタグ情報を取得
   * @param articleId 記事ID
   * @returns タグの配列。記事が存在しない場合はnull
   */
  getArticleTags(articleId: string): Promise<string[] | null>;

  /**
   * お気に入り一覧を取得
   * @param visitorId 訪問者ID
   * @returns お気に入りの配列（追加日時降順）
   */
  getFavorites(visitorId: string): Promise<Favorite[]>;

  /**
   * お気に入りを追加
   * @param favorite 追加するお気に入り
   */
  addFavorite(favorite: Favorite): Promise<void>;

  /**
   * お気に入りを解除
   * @param visitorId 訪問者ID
   * @param articleId 記事ID
   */
  removeFavorite(visitorId: string, articleId: string): Promise<void>;

  /**
   * 嗜好データをリセット
   * - visitors: preference_vector, tag_weights, object_class_preference,
   *   starter_pack, onboarding_completed_at を初期化
   * - feedback: 全行削除
   * - recommendation_log: 全行削除
   * - favorites, view_history: 保持
   *
   * @param visitorId 訪問者ID
   */
  resetPreference(visitorId: string): Promise<void>;
}

/**
 * スターターパック種別
 *
 * オンボーディング時にユーザーが選択するジャンル嗜好。
 * - classic: 定番・名作
 * - horror: ホラー・恐怖
 * - scifi: SF・テクノロジー
 * - heartwarming: 感動・ハートフル
 * - mystery: ミステリー・考察
 * - jp: 日本支部オリジナル
 * - custom: カスタム（SCP番号を直接入力）
 */
export type StarterPackType =
  | "classic"
  | "horror"
  | "scifi"
  | "heartwarming"
  | "mystery"
  | "jp"
  | "custom";

/**
 * 嗜好プロファイル
 *
 * ユーザーの嗜好情報を保持するオブジェクト。
 */
export interface PreferenceProfile {
  /** 訪問者ID */
  visitorId: string;

  /** タグ重み（タグ名 → 重み値） */
  tagWeights: Record<string, number>;

  /** オブジェクトクラス嗜好（クラス名 → 重み値） */
  objectClassPreference: Record<string, number>;

  /** 選択したスターターパック */
  starterPack?: StarterPackType;

  /** オンボーディング完了日時（ISO 8601形式） */
  onboardingCompletedAt?: string;

  /** 嗜好埋め込みベクトル */
  preferenceEmbedding?: number[];

  /** 作成日時（ISO 8601形式） */
  createdAt: string;

  /** 更新日時（ISO 8601形式） */
  updatedAt: string;
}

/**
 * 閲覧履歴
 *
 * ユーザーの記事閲覧履歴を保持するオブジェクト。
 */
export interface ViewHistory {
  /** 複合ID: `${visitorId}_${articleId}_${timestamp}` */
  id: string;

  /** 訪問者ID */
  visitorId: string;

  /** 記事ID */
  articleId: string;

  /** 閲覧日時（ISO 8601形式） */
  viewedAt: string;

  /** 閲覧時間（秒）。ページ離脱前は未設定 */
  duration?: number;
}

/**
 * フィードバックメタデータ
 *
 * 「次へ」操作時の暗黙的シグナル。
 * interestLevelはscrollDepthとdwellTimeから導出される行動パターン分類。
 */
export interface FeedbackMetadata {
  /** スクロール深度（0-100%） */
  scrollDepth: number;
  /** 滞在時間（秒） */
  dwellTime: number;
  /** 興味度（行動パターン分類） */
  interestLevel: "low" | "medium" | "high";
}

/**
 * フィードバック
 *
 * ユーザーの記事に対するフィードバック。
 * - like: 明示的な「いいね」（現在はフロントエンドから発火しない。レガシー互換）
 * - next: 「次へ」操作。metadataで行動パターンを記録
 */
export interface Feedback {
  /** 複合ID: `${visitorId}_${articleId}` */
  id: string;

  /** 訪問者ID */
  visitorId: string;

  /** 記事ID */
  articleId: string;

  /** フィードバック種別 */
  type: "like" | "next";

  /** メタデータ（next操作時の暗黙的シグナル） */
  metadata?: FeedbackMetadata;

  /** 作成日時（ISO 8601形式） */
  createdAt: string;
}

/**
 * 推薦ログ
 *
 * 推薦アルゴリズムが出力した推薦とその結果を保持するオブジェクト。
 */
export interface RecommendationLog {
  /** ログID */
  id: string;

  /** 訪問者ID */
  visitorId: string;

  /** 推薦された記事ID */
  articleId: string;

  /** 推薦日時（ISO 8601形式） */
  recommendedAt: string;

  /** 推薦ソース */
  source: "preference" | "serendipity";

  /** ユーザーがクリックしたか */
  clicked: boolean;
}

/**
 * お気に入り
 *
 * ユーザーが保存したお気に入り記事。Likeより強い正シグナル（重み2.0）。
 */
export interface Favorite {
  /** 複合ID: `${visitorId}_${articleId}` */
  id: string;

  /** 訪問者ID */
  visitorId: string;

  /** 記事ID */
  articleId: string;

  /** 追加日時（ISO 8601形式） */
  addedAt: string;
}
