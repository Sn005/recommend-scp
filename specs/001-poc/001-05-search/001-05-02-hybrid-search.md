# Subtask-001-05-02: ハイブリッド検索実装

## 概要

Embedding類似度とタグ一致度を組み合わせたハイブリッド検索を実装する。

## ユーザーストーリー

**As a** 開発者
**I want** EmbeddingとタグをWeight付きで組み合わせた検索をする
**So that** ハイブリッド推薦の有効性を検証できる

## Acceptance Criteria（EARS記法）

### ハイブリッド検索

- [x] WHEN 開発者がハイブリッド検索スクリプトを実行した際
      GIVEN クエリ記事IDと重みパラメータを指定した場合
      THEN Embedding類似度とタグ一致度を組み合わせたスコアで検索する
      AND 上位5件の結果を返す

- [x] WHEN 重みパラメータを確認した際
      GIVEN embedding_weight と tag_weight を指定する場合
      THEN embedding_weight + tag_weight = 1.0 となる
      AND デフォルトは embedding_weight=0.7, tag_weight=0.3

### スコア計算

- [x] WHEN ハイブリッドスコアを計算する際
      GIVEN 各スコアが計算済みの場合
      THEN 以下の式で最終スコアを算出する：
      ```
      final_score = embedding_weight * embedding_score + tag_weight * tag_score
      ```
      AND tag_score は「一致タグ数 / 全タグ数」で計算する

### 比較検証

- [x] WHEN ハイブリッド検索結果を確認した際
      GIVEN ベクトル検索のみの結果もある場合
      THEN 両方の結果を並べて比較できる
      AND ハイブリッド検索で「同じテーマ」の記事が上位に来やすいか確認できる

### タグスコアの詳細

- [x] WHEN タグ一致度を計算する際
      GIVEN クエリ記事とターゲット記事のタグがある場合
      THEN 以下のカテゴリ別に一致を計算する：
      - object_class: 完全一致で1.0、不一致で0.0
      - genre: ジャッカード類似度（共通 / 和集合）
      - theme: ジャッカード類似度
      - format: 完全一致で1.0、不一致で0.0
      AND 全カテゴリの平均をtag_scoreとする

## 設計

### スコア計算

```typescript
// src/search/hybrid-search.ts

export interface HybridSearchParams {
  queryId: string;
  embeddingWeight?: number;  // default: 0.7
  tagWeight?: number;        // default: 0.3
  limit?: number;            // default: 5
}

export interface HybridSearchResult {
  articleId: string;
  title: string;
  finalScore: number;
  embeddingScore: number;
  tagScore: number;
  matchedTags: {
    object_class: boolean;
    genre: string[];      // 一致したジャンル
    theme: string[];      // 一致したテーマ
    format: boolean;
  };
}

// タグスコア計算
function calculateTagScore(
  queryTags: ExtractedTags,
  targetTags: ExtractedTags
): number {
  const scores: number[] = [];

  // object_class: 完全一致
  scores.push(queryTags.object_class === targetTags.object_class ? 1.0 : 0.0);

  // genre: ジャッカード類似度
  scores.push(jaccardSimilarity(queryTags.genre, targetTags.genre));

  // theme: ジャッカード類似度
  scores.push(jaccardSimilarity(queryTags.theme, targetTags.theme));

  // format: 完全一致
  scores.push(queryTags.format === targetTags.format ? 1.0 : 0.0);

  // 平均
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

function jaccardSimilarity(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  const intersection = [...setA].filter(x => setB.has(x)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}
```

### 検索アルゴリズム

```typescript
async function hybridSearch(params: HybridSearchParams): Promise<HybridSearchResult[]> {
  const { queryId, embeddingWeight = 0.7, tagWeight = 0.3, limit = 5 } = params;

  // 1. ベクトル検索で候補を取得（limit の 3倍程度）
  const candidates = await vectorSearch({ queryId, limit: limit * 3 });

  // 2. クエリ記事のタグを取得
  const queryTags = await getArticleTags(queryId);

  // 3. 各候補のタグスコアを計算
  const scoredCandidates = await Promise.all(
    candidates.results.map(async (candidate) => {
      const targetTags = await getArticleTags(candidate.articleId);
      const tagScore = calculateTagScore(queryTags, targetTags);
      const finalScore =
        embeddingWeight * candidate.similarityScore +
        tagWeight * tagScore;

      return {
        ...candidate,
        embeddingScore: candidate.similarityScore,
        tagScore,
        finalScore,
      };
    })
  );

  // 4. 最終スコアでソートして上位を返す
  return scoredCandidates
    .sort((a, b) => b.finalScore - a.finalScore)
    .slice(0, limit);
}
```

### スクリプト実行

```bash
# デフォルト重み（embedding=0.7, tag=0.3）
pnpm --filter poc run:04-search -- --hybrid --id SCP-173

# カスタム重み
pnpm --filter poc run:04-search -- --hybrid --id SCP-173 --embedding-weight 0.5 --tag-weight 0.5

# ベクトルのみとの比較
pnpm --filter poc run:04-search -- --compare --id SCP-173
```

## テストケース

- [x] ハイブリッド検索で結果が返される
- [x] 重みパラメータが正しく適用される
- [x] タグスコアが0-1の範囲である
- [x] 最終スコアが正しく計算される
- [x] ベクトル検索のみと比較して、同テーマの記事が上位に来やすい
- [x] 検索時間が2秒以内である

## 実装状況
- **status**: completed
