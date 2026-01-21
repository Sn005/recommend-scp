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

// Factory
export { createPreferenceStorage } from "./preference-store";
