/**
 * @file 嗜好ベクトル計算
 * @description ユーザーの行動履歴から嗜好ベクトル（preferenceEmbedding）を計算する
 * @see specs/004-recommend/004-01-recommend-foundation/004-01-05.md
 */

/**
 * シグナル別重み設定
 */
export interface SignalWeights {
  /** お気に入り重み（デフォルト: 2.0） */
  favorite: number;
  /** Like重み（デフォルト: 1.0）レガシー互換 */
  like: number;
  /** 読了重み（デフォルト: 0.3） */
  view: number;
  /** 深く読んで次へ（デフォルト: 0.3） */
  nextHigh: number;
  /** 即通過で次へ（デフォルト: -0.2） */
  nextLow: number;
}

/**
 * 嗜好ベクトル計算の入力
 */
export interface PreferenceVectorInput {
  /** お気に入り記事ID */
  favoriteArticleIds: string[];
  /** Like記事ID（レガシー互換） */
  likedArticleIds: string[];
  /** 読了記事ID（フィードバックなしの閲覧のみ） */
  viewedArticleIds: string[];
  /** 深く読んで次へ（interestLevel: high） */
  nextHighArticleIds: string[];
  /** 即通過で次へ（interestLevel: low） */
  nextLowArticleIds: string[];
}

/**
 * 重み付きベクトル
 */
interface WeightedVector {
  vector: number[];
  weight: number;
}

/**
 * デフォルトのシグナル重み
 */
export const DEFAULT_SIGNAL_WEIGHTS: SignalWeights = {
  favorite: 2.0,
  like: 1.0,
  view: 0.3,
  nextHigh: 0.3,
  nextLow: -0.2,
};

/**
 * 重み付け平均を計算
 *
 * 各ベクトルに重みを乗じて合計し、重みの絶対値の合計で割って正規化する。
 * 負の重み（nextLow）も正しく処理される。
 *
 * @param items 重み付きベクトルの配列
 * @returns 重み付け平均ベクトル（空配列の場合は空配列）
 */
export function computeWeightedAverage(items: WeightedVector[]): number[] {
  if (items.length === 0) {
    return [];
  }

  const dimension = items[0].vector.length;
  const result = new Array<number>(dimension).fill(0);
  let totalWeight = 0;

  // 重み付き合計を計算
  for (const { vector, weight } of items) {
    for (let i = 0; i < dimension; i++) {
      result[i] += vector[i] * weight;
    }
    totalWeight += Math.abs(weight);
  }

  // 総重みで正規化
  if (totalWeight === 0) {
    return result;
  }

  for (let i = 0; i < dimension; i++) {
    result[i] /= totalWeight;
  }

  return result;
}

/**
 * 記事IDリストからEmbeddingを取得し、重み付きベクトルとして収集
 *
 * @param articleIds 記事IDリスト
 * @param weight 適用する重み
 * @param getEmbedding Embedding取得関数
 * @returns 重み付きベクトルの配列
 */
async function collectWeightedVectors(
  articleIds: string[],
  weight: number,
  getEmbedding: (articleId: string) => Promise<number[] | null>
): Promise<WeightedVector[]> {
  const results: WeightedVector[] = [];

  for (const articleId of articleIds) {
    try {
      const embedding = await getEmbedding(articleId);
      if (embedding) {
        results.push({ vector: embedding, weight });
      }
    } catch {
      // Embedding取得エラーの場合はスキップ
    }
  }

  return results;
}

/**
 * 嗜好ベクトルを計算
 *
 * ユーザーの行動履歴から Embeddingの重み付け平均として嗜好ベクトルを計算する。
 *
 * - お気に入り: 重み2.0（最も強い正シグナル）
 * - Like: 重み1.0（レガシー互換）
 * - 読了: 重み0.3（フィードバックなしの閲覧のみ）
 * - 深読み次へ: 重み0.3（interestLevel: high）
 * - 即通過次へ: 重み-0.2（interestLevel: low、弱いネガティブ）
 *
 * @param input 行動履歴（各シグナルの記事ID配列）
 * @param getEmbedding 記事IDからEmbeddingを取得する関数
 * @param weights シグナル別重み（省略時はデフォルト値）
 * @returns 嗜好ベクトル（履歴が空の場合はnull）
 */
export async function calculatePreferenceVector(
  input: PreferenceVectorInput,
  getEmbedding: (articleId: string) => Promise<number[] | null>,
  weights?: Partial<SignalWeights>
): Promise<number[] | null> {
  // デフォルト重みとマージ
  const effectiveWeights: SignalWeights = {
    ...DEFAULT_SIGNAL_WEIGHTS,
    ...weights,
  };

  // 全てのシグナルを収集
  const [favoriteVectors, likedVectors, viewedVectors, nextHighVectors, nextLowVectors] =
    await Promise.all([
      collectWeightedVectors(input.favoriteArticleIds, effectiveWeights.favorite, getEmbedding),
      collectWeightedVectors(input.likedArticleIds, effectiveWeights.like, getEmbedding),
      collectWeightedVectors(input.viewedArticleIds, effectiveWeights.view, getEmbedding),
      collectWeightedVectors(input.nextHighArticleIds, effectiveWeights.nextHigh, getEmbedding),
      collectWeightedVectors(input.nextLowArticleIds, effectiveWeights.nextLow, getEmbedding),
    ]);

  // 全てのベクトルを結合
  const allVectors = [
    ...favoriteVectors,
    ...likedVectors,
    ...viewedVectors,
    ...nextHighVectors,
    ...nextLowVectors,
  ];

  // 履歴が空（有効なEmbeddingが1つもない）の場合はnull
  if (allVectors.length === 0) {
    return null;
  }

  // 重み付け平均を計算
  return computeWeightedAverage(allVectors);
}
