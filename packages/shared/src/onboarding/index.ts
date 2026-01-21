/**
 * @file オンボーディングモジュール
 * @see specs/004-recommend/004-03-onboarding/004-03-01.md
 */

export type { StarterPackDefinition } from "./types";
export {
  STARTER_PACK_TYPES,
  STARTER_PACKS,
  getStarterPackList,
  getStarterPack,
} from "./starter-packs";
