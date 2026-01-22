/**
 * @file 推薦ロジックモジュール
 * @description 嗜好プロファイル計算・推薦アルゴリズムを提供
 */

export { PreferenceProfiler } from "./profiler";
export { SignalProcessor } from "./signal-processor";
export {
  calculatePreferenceVector,
  computeWeightedAverage,
  DEFAULT_SIGNAL_WEIGHTS,
  type SignalWeights,
  type PreferenceVectorInput,
} from "./preference-vector";
