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
  /** Like重み（デフォルト: 1.0） */
  like: number;
  /** 読了重み（デフォルト: 0.3） */
  view: number;
  /** Dislike重み（デフォルト: -0.5） */
  dislike: number;
}

/**
 * 嗜好ベクトル計算の入力
 */
export interface PreferenceVectorInput {
  /** お気に入り記事ID */
  favoriteArticleIds: string[];
  /** Like記事ID */
  likedArticleIds: string[];
  /** 読了記事ID（Like/Dislikeなし） */
  viewedArticleIds: string[];
  /** Dislike記事ID */
  dislikedArticleIds: string[];
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
  dislike: -0.5,
};

/**
 * 重み付け平均を計算
 *
 * 各ベクトルに重みを乗じて合計し、重みの絶対値の合計で割って正規化する。
 * 負の重み（Dislike）も正しく処理される。
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
 * ユーザーの行動履歴（Like/お気に入り/読了/Dislike）から
 * Embeddingの重み付け平均として嗜好ベクトルを計算する。
 *
 * - お気に入り: 重み2.0（最も強い正シグナル）
 * - Like: 重み1.0（強い正シグナル）
 * - 読了: 重み0.3（弱い正シグナル）
 * - Dislike: 重み-0.5（負のシグナル、避けるべき方向）
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
  const [favoriteVectors, likedVectors, viewedVectors, dislikedVectors] = await Promise.all([
    collectWeightedVectors(input.favoriteArticleIds, effectiveWeights.favorite, getEmbedding),
    collectWeightedVectors(input.likedArticleIds, effectiveWeights.like, getEmbedding),
    collectWeightedVectors(input.viewedArticleIds, effectiveWeights.view, getEmbedding),
    collectWeightedVectors(input.dislikedArticleIds, effectiveWeights.dislike, getEmbedding),
  ]);

  // 全てのベクトルを結合
  const allVectors = [...favoriteVectors, ...likedVectors, ...viewedVectors, ...dislikedVectors];

  // 履歴が空（有効なEmbeddingが1つもない）の場合はnull
  if (allVectors.length === 0) {
    return null;
  }

  // 重み付け平均を計算
  return computeWeightedAverage(allVectors);
}
