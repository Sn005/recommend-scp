# 推薦ナビゲーション修正計画

## ブランチ

`claude/fix-recommendation-navigation-9u5gO`

## 既存コミット（完了済み）

| コミット  | 内容                                                                     |
| --------- | ------------------------------------------------------------------------ |
| `c746fbf` | エンジンフォールバック追加、hasMoreロジック変更、consecutiveEmptyRef導入 |
| `340c807` | 段階的類似度緩和（Progressive Similarity Relaxation）導入                |

## 残課題

### Bug 1: `setHasMore(hasMoreData)` が重複検出を上書き

**ファイル**: `apps/web/src/app/(main)/recommend/_hooks/useInfiniteArticles.ts` (行191-201)

**現象**: サーバーが記事を返したが全てフロントエンド側で既に保持している場合:

1. `setArticles`コールバック内で `consecutiveEmptyRef++` → `setHasMore(false)` が呼ばれる
2. コールバック直後の行201で `setHasMore(hasMoreData)` が `true` で上書き
3. React バッチ処理で最後の `setHasMore(true)` が勝つ
4. → 重複フェッチが無限ループする可能性

**修正**: `setArticles`コールバック内で重複検出した場合、行201の`setHasMore(hasMoreData)`をスキップする

```typescript
// 修正案
let shouldUpdateHasMore = true;

setArticles((prev) => {
  const existingIds = new Set(prev.map((a) => a.id));
  const uniqueNewArticles = newArticles.filter((a) => !existingIds.has(a.id));
  if (uniqueNewArticles.length === 0) {
    consecutiveEmptyRef.current += 1;
    if (consecutiveEmptyRef.current >= 2) {
      setHasMore(false);
    }
    shouldUpdateHasMore = false;
    return prev;
  }
  consecutiveEmptyRef.current = 0;
  return [...prev, ...uniqueNewArticles];
});

if (shouldUpdateHasMore) {
  setHasMore(hasMoreData);
}
```

### Bug 2: `goToNext` が末尾でロックする

**ファイル**: `apps/web/src/app/(main)/recommend/_hooks/useInfiniteArticles.ts` (行227-236)

**現象**: `currentIndex === articles.length - 1` の場合、`goToNext` は何もしない。loadMore完了後も自動的に進まない。

**修正**: `goToNext` が末尾にいる場合、`hasMore && !isLoadingMore` なら `loadMore` をトリガーする。ただし `goToNext` 自体は `useInfiniteArticles` 内部のナビゲーション関数で、`page.tsx` の `handleNext` が UI 制御を担当するため、`goToNext` のロック自体は正しい動作。問題は `handleNext` 側。

### Bug 3: `handleNext` がサイレントに失敗する

**ファイル**: `apps/web/src/app/(main)/recommend/page.tsx` (行166-167)

**現象**: `articles[currentIndex + 1]` が未定義の場合、`handleNext` は `return` してユーザーにフィードバックなし。

**修正案**: `nextArticle` がない場合でも `loadMore` 実行中なら待機状態を表示する。ただし `handleNext` は `page.tsx` 側の関数であり、`isLoadingMore` を `useInfiniteArticles` から取得して活用すべき。

→ フロントエンドの `page.tsx` で `isLoadingMore` をデストラクチャリングし、FloatingUI に渡して「読み込み中」状態を表示。

## 修正対象ファイルと変更内容

| ファイル                      | 変更内容                                                                              |
| ----------------------------- | ------------------------------------------------------------------------------------- |
| `useInfiniteArticles.ts`      | Bug 1: `setHasMore` 上書き防止                                                        |
| `useInfiniteArticles.test.ts` | Bug 1: 全件重複時に `hasMore` が `true` に上書きされないテスト追加                    |
| `page.tsx`                    | Bug 3: `isLoadingMore` / `hasMore` をデストラクチャリングに追加、末尾到達時の UX 改善 |
| `page.test.tsx`               | Bug 3: 末尾到達時のテスト追加（必要に応じて）                                         |

## 修正しないもの

- `filterValidArticles`: 防御的フィルタとして残す（DB制約で空URLは発生しないが、念のため）
- `consecutiveEmptyRef` 閾値(2): エンジン側のフォールバック＋段階的緩和により、真に0件が2連続するのは本当に枯渇した場合のみ
- `goToNext` のロック動作: `page.tsx` の `handleNext` が制御する責務であり、フック側は配列範囲を守るのが正しい

## 実行順序

1. Bug 1 修正（useInfiniteArticles.ts + テスト）
2. Bug 3 修正（page.tsx + 必要に応じてテスト）
3. `pnpm format` 実行
4. テスト実行確認
5. コミット＆プッシュ
