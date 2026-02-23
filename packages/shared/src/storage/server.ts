/**
 * @file Storage module - Server-side exports
 * @description サーバーサイドで使用可能なストレージモジュール（ブラウザ専用APIを除外）
 */

// Types (ブラウザAPI依存なし)
export type {
  PreferenceStorage,
  StarterPackType,
  PreferenceProfile,
  ViewHistory,
  Feedback,
  FeedbackMetadata,
  RecommendationLog,
  Favorite,
} from "./types";

// Server-safe implementations
export { SupabaseTagStorage } from "./supabase-tag-storage";
