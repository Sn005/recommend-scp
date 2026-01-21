/**
 * @file オンボーディングモジュール
 * @see specs/004-recommend/004-03-onboarding/004-03-01.md
 * @see specs/004-recommend/004-03-onboarding/004-03-02.md
 */

export type { StarterPackDefinition } from "./types";
export type { EmbeddingRepository } from "./onboarding-service";
export {
  STARTER_PACK_TYPES,
  STARTER_PACKS,
  getStarterPackList,
  getStarterPack,
} from "./starter-packs";
export { OnboardingService } from "./onboarding-service";
