/**
 * Storage module - re-exports
 */

// Types
export type {
  PreferenceStorage,
  StarterPackType,
  PreferenceProfile,
  ViewHistory,
  Feedback,
  RecommendationLog,
} from "./types";

// Implementations
export { IndexedDBStorage } from "./indexed-db";
export { SupabaseTagStorage } from "./supabase-tag-storage";
export { CompositeStorage } from "./composite-storage";

// Factory
export { createPreferenceStorage } from "./preference-store";
