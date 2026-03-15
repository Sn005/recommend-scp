# スロークエリ最適化ドキュメント

本ドキュメントは、Supabase (PostgreSQL + pgvector) 環境におけるスロークエリ対応の方針・判断基準・対応フロー・記録テンプレートを定義する。

## 対応方針

### 判断基準

スロークエリの検出・対応は以下を起点とする:

- **Supabase ダッシュボードのアラート**: Query Performance アドバイザーで警告されたクエリ
- **pg_stat_statements**: 平均実行時間が目標値を超過しているクエリ

上記いずれかで検出されたクエリを対応候補とし、影響度（実行頻度 × 実行時間）を考慮して優先順位を決定する。

### パフォーマンス目標

| 指標           | 目標値     | 備考                       |
| -------------- | ---------- | -------------------------- |
| API レスポンス | 200ms 以下 | キャッシュ活用を含む       |
| ベクトル検索   | 100ms 以下 | pgvector HNSW インデックス |

> 参照: [アーキテクチャ定義 - パフォーマンス要件](../../.ai/architecture.md)

### 対応スコープ

本 EPIC ではピンポイントの改善に限定する:

- **インデックス追加**: 不足しているインデックスの作成
- **クエリ書き換え**: 非効率なクエリの最適化
- **RPC 関数最適化**: 関数本体の書き換え（入出力の互換性は維持）

大規模なスキーマ変更やアーキテクチャ変更は対象外とする。

### 技術的制約

- 既存の API 入出力互換性を維持すること
- 既存テストが全て通過する状態を保つこと
- マイグレーションは Supabase CLI (`supabase migration new`) で管理すること

## 対応フロー

スロークエリの検出から解決までの対応フローを以下に定義する。

```
1. データ共有
   Supabase ダッシュボードの pg_stat_statements データを共有

2. 分析
   EXPLAIN ANALYZE で実行計画を確認し、ボトルネックを特定

3. 方針決定
   改善方法を選択（インデックス追加 / クエリ書き換え / RPC関数最適化）

4. マイグレーション作成
   supabase migration new で改善用マイグレーションを作成・実装

5. 効果検証
   Supabase ダッシュボードでアラート解消・目標値達成を確認

6. 記録
   本ドキュメントの「対応記録」セクションに結果を追記
```

## 対応記録テンプレート

新しい対応を記録する際は、以下のテンプレートをコピーして「対応記録」セクションに追記する。

```markdown
### [YYYY-MM-DD] 対応 #N: [クエリ概要]

#### 検出

- **検出元**: Supabase ダッシュボード / pg_stat_statements
- **対象クエリ**: `[クエリまたはRPC関数名]`
- **検出時の実行時間**: [平均 Xms / 最大 Yms]
- **実行頻度**: [Z回/日]

#### 分析

- **実行計画のボトルネック**: [Seq Scan / Missing Index / 非効率なJOIN 等]
- **影響範囲**: [対象API / 対象機能]

#### Why（なぜこの改善方法を選択したか）

[選択した改善方法とその理由を記述]

#### How（改善内容）

- **改善方法**: [インデックス追加 / クエリ書き換え / RPC関数最適化]
- **マイグレーションファイル**: `supabase/migrations/[ファイル名].sql`
- **変更内容の概要**: [具体的な変更内容]

#### 効果

| 指標     | 改善前 | 改善後 | 目標値  |
| -------- | ------ | ------ | ------- |
| 実行時間 | Xms    | Yms    | ≤ 200ms |

- **アラート解消**: [はい / いいえ]
```

## 分析記録

### [2026-02-21] pg_stat_statements 分析・優先度判定

#### データ取得日

- **取得元**: Supabase ダッシュボード Query Performance + pg_stat_statements
- **取得日時**: 2026-02-21

#### クエリ・コード突合せ結果

pg_stat_statements の上位20クエリを既存コードベースのRepository/RPC関数と突合せした結果を以下に示す。

##### ユーザー操作に直結するクエリ

| #   | クエリ概要                               | 対応コード                                                                            | calls | mean (ms) | total (ms) | 全体比率 |
| --- | ---------------------------------------- | ------------------------------------------------------------------------------------- | ----- | --------- | ---------- | -------- |
| 1   | search_articles_by_embedding (RPC)       | `SupabaseVectorSearch.searchByEmbedding()` → `ArticlesRepository.searchByEmbedding()` | 197   | **2,192** | 431,879    | 21.18%   |
| 3   | search_articles_by_embedding (RPC)       | 同上（パラメータ違い）                                                                | 238   | **1,701** | 404,746    | 19.85%   |
| 4   | search_articles_by_embedding (RPC)       | 同上（パラメータ違い）                                                                | 62    | **1,485** | 92,094     | 4.52%    |
| 7   | search_articles_by_embedding (RPC)       | 同上（パラメータ違い）                                                                | 31    | **2,128** | 65,969     | 3.23%    |
| 9   | search_articles_by_embedding (RPC)       | 同上（パラメータ違い）                                                                | 36    | **1,786** | 64,278     | 3.15%    |
| 18  | search_articles_by_unexplored_tags (RPC) | `SupabaseVectorSearch` (diversity)                                                    | 50    | **479**   | 23,937     | 1.17%    |

> **Note**: search_articles_by_embedding が pg_stat_statements 上で5つの別エントリとして出現するのは、PostgREST がプリペアドステートメントのパラメータ組み合わせ別に統計を記録するため。合計 564 calls、合計時間 1,058,965ms（**全体の51.93%**）。

##### パイプライン（バッチ処理）クエリ

| #   | クエリ概要                                                             | 対応コード                                                 | calls  | mean (ms) | total (ms) | 全体比率 |
| --- | ---------------------------------------------------------------------- | ---------------------------------------------------------- | ------ | --------- | ---------- | -------- |
| 2   | UPDATE scp_articles SET tagging_status                                 | `BatchTaggingProcessor.updateStatus()`                     | 6,004  | 70        | 422,602    | 20.72%   |
| 6   | UPDATE scp_articles SET embedding, embedding_status, last_processed_at | `BatchEmbeddingProcessor.updateStatus()`                   | 9,267  | 8         | 75,477     | 3.70%    |
| 8   | UPDATE scp_articles SET last_tagged_at, tagging_status                 | `BatchTaggingProcessor.updateStatus()`                     | 5,996  | 11        | 64,564     | 3.17%    |
| 11  | INSERT INTO scp_articles (UPSERT)                                      | `DbSaver.saveArticle()` / `DiffDbOperations.saveArticle()` | 27,846 | 1.5       | 40,481     | 1.99%    |
| 14  | SELECT scp_articles WHERE tagging_status = ?                           | `BatchTaggingProcessor.getPendingArticles()`               | 24     | **1,410** | 33,834     | 1.66%    |
| 17  | SELECT scp_articles WHERE embedding_status = ?                         | `BatchEmbeddingProcessor.getPendingArticles()`             | 32     | **758**   | 24,247     | 1.19%    |
| 20  | UPDATE scp_articles SET is_deleted                                     | `DiffDbOperations.markAsDeleted()`                         | 1,000  | 16        | 15,640     | 0.77%    |

##### ダッシュボード・システムクエリ（対応不要）

| #   | クエリ概要                              | 分類                       | calls | mean (ms) | 備考                         |
| --- | --------------------------------------- | -------------------------- | ----- | --------- | ---------------------------- |
| 5   | pg_available_extensions()               | ダッシュボード             | 791   | 101       | Supabase管理画面の内部クエリ |
| 10  | UPDATE LOWER(article_id)                | 一回限りのマイグレーション | 1     | 49,097    | 実行済み、再発なし           |
| 12  | SELECT from scp_articles (table viewer) | ダッシュボード             | 92    | 411       | テーブルビューア             |
| 13  | SELECT name FROM pg_timezone_names      | システム                   | 112   | 303       | PostgreSQL内部               |
| 15  | pg_proc (functions view)                | ダッシュボード             | 106   | 272       | 関数一覧表示                 |
| 16  | HNSW index creation                     | 一回限りのマイグレーション | 1     | 26,972    | 実行済み、再発なし           |
| 19  | table_privileges                        | ダッシュボード             | 277   | 83        | 権限表示                     |

#### 優先度判定

ユーザー影響度 = 呼び出し頻度 × 平均実行時間 で算出し、パフォーマンス目標（API: 200ms以下、ベクトル検索: 100ms以下）との乖離度も加味。

| 優先度       | 対象クエリ                           | ユーザー影響度                            | 理由                                                                          |
| ------------ | ------------------------------------ | ----------------------------------------- | ----------------------------------------------------------------------------- |
| **高**       | `search_articles_by_embedding`       | **564 calls × 1,858ms avg = 1,058,965ms** | 推薦取得API直結。目標100msに対し**18.6倍**超過。全クエリ時間の51.93%を占有    |
| **高**       | `search_articles_by_unexplored_tags` | **50 calls × 479ms = 23,937ms**           | 推薦の多様性確保に使用。目標200msに対し**2.4倍**超過                          |
| **中**       | `SELECT WHERE tagging_status = ?`    | **24 calls × 1,410ms = 33,834ms**         | パイプラインのバッチ取得。SELECT \* で embedding (vector(1536)) を含む大量I/O |
| **中**       | `SELECT WHERE embedding_status = ?`  | **32 calls × 758ms = 24,247ms**           | 同上。パイプラインのバッチ取得                                                |
| **低**       | `UPDATE tagging_status` 系           | **12,000 calls × 10-70ms**                | 個別は目標内。total_timeは大きいが1件あたりは許容範囲                         |
| **対応不要** | ダッシュボード・システム系           | -                                         | アプリケーション外。制御不能                                                  |
| **対応不要** | 一回限りのマイグレーション           | -                                         | 再発しない                                                                    |

#### ボトルネック分析・改善方針

##### 優先度 高: search_articles_by_embedding

**ボトルネック**:

1. **`get_object_class(a.tags)` の行ごと関数呼び出し**: 各マッチ行で `tag_dictionary` テーブルへのSELECTが発生。match_count=10 でも内部的にスキャンされる行数は多い
2. **コサイン距離の3重計算**: WHERE句で `(1 - (a.embedding <=> query_vector))` を `min_similarity` と `max_similarity` の2回、ORDER BY で `a.embedding <=> query_vector` を1回、計3回距離計算
3. **LEFT JOIN article_translations**: 各行でURL取得のためのJOIN。article_translations にインデックスがあるが、結合コスト加算
4. **HNSWインデックスの ef_search パラメータ**: デフォルト値が小さいと精度を上げるためにスキャン範囲が拡大する可能性

**改善方針**:

| 改善 | 方法                                                                                             | 期待効果 | 難易度 |
| ---- | ------------------------------------------------------------------------------------------------ | -------- | ------ |
| A    | **RPC関数最適化**: `get_object_class()` をJOINベースに書き換え（行ごと関数呼び出し → 1回のJOIN） | 大       | 低     |
| B    | **クエリ書き換え**: 距離計算を1回にまとめる（CTEまたはサブクエリで `dist` を計算し再利用）       | 中       | 低     |
| C    | **旧IVFFlatインデックスの削除**: HNSWと共存しているIVFFlatを削除し、プランナの選択を単純化       | 小〜中   | 低     |
| D    | **HNSWパラメータ調整**: `ef_search` を適切な値に設定（SET hnsw.ef_search = 100 等）              | 中       | 低     |

##### 優先度 高: search_articles_by_unexplored_tags

**ボトルネック**:

1. **`tags` カラム (TEXT[]) にGINインデックスなし**: `NOT (a.tags && explored_tags)` がSeq Scanを強制。全行のタグ配列をスキャン
2. **`get_object_class(a.tags)` の行ごと関数呼び出し**: search_articles_by_embedding と同様
3. **CASE式によるORDER BY**: 動的ソートはインデックスを活用できない

**改善方針**:

| 改善 | 方法                                                                                       | 期待効果 | 難易度 |
| ---- | ------------------------------------------------------------------------------------------ | -------- | ------ |
| E    | **インデックス追加**: `CREATE INDEX idx_scp_articles_tags ON scp_articles USING GIN(tags)` | 大       | 低     |
| F    | **RPC関数最適化**: `get_object_class()` をJOINベースに書き換え（Aと共通）                  | 中       | 低     |

##### 優先度 中: SELECT WHERE tagging_status / embedding_status

**ボトルネック**:

1. **SELECT \* で embedding (vector(1536)) を返却**: 1536次元ベクトルをJSONシリアライズする巨大I/O。パイプラインでは embedding は不要
2. **Cache hit rate 94.7%** (tagging_status): 他のクエリ（99%+）と比較して低い。大きな行サイズが原因

**改善方針**:

| 改善 | 方法                                                                                                   | 期待効果 | 難易度 |
| ---- | ------------------------------------------------------------------------------------------------------ | -------- | ------ |
| G    | **アプリケーション側の修正**: パイプラインの `.select("*")` を必要カラムのみに変更（embedding を除外） | 大       | 低     |

#### 改善実施の推奨順序

1. **A + B + C + D** (search_articles_by_embedding 最適化) — ユーザー影響度最大、全体の51.93%
2. **E + F** (search_articles_by_unexplored_tags 最適化) — GINインデックス追加で大幅改善見込み
3. **G** (パイプラインSELECT最適化) — コード変更のみ、マイグレーション不要

> 上記はSubtask 012-02-02（スロークエリ改善実装）で実施する。

---

## 対応記録

### [2026-02-21] 対応 #1: A案 スロークエリ改善（改善A〜F）

#### 検出

- **検出元**: pg_stat_statements
- **対象クエリ**: `search_articles_by_embedding`, `search_articles_by_unexplored_tags`
- **検出時の実行時間**: embedding 平均 1,858ms / unexplored_tags 平均 479ms
- **実行頻度**: embedding 564回 / unexplored_tags 50回

#### 分析

- **実行計画のボトルネック**: get_object_class() の行ごと関数呼び出し(N+1)、距離の3重計算、IVFFlat/HNSW共存によるプランナ混乱、tags配列にGINインデックスなし
- **影響範囲**: 推薦取得API（全クエリ時間の51.93%を占有）

#### Why

ユーザー操作に直結する推薦APIのレスポンスが目標200msを大幅に超過。N+1問題・距離の重複計算・インデックス競合という複数のボトルネックをまとめて解消する。

#### How

- **改善方法**: RPC関数最適化 + インデックス整理
- **マイグレーションファイル**: `supabase/migrations/20260221000001_optimize_slow_queries.sql`
- **変更内容の概要**:
  - A+F: get_object_class() → LEFT JOIN LATERAL に書き換え
  - B: 距離計算をCTEで1回にまとめる
  - C: 旧IVFFlatインデックスを削除（HNSWに統一）
  - D: ef_search パラメータを明示化（40、デフォルト値）
  - E: tags カラムに GIN インデックス追加

#### 効果

| 指標                         | 改善前  | 改善後 | 改善率 | 目標値  |
| ---------------------------- | ------- | ------ | ------ | ------- |
| embedding 平均実行時間       | 1,858ms | 391ms  | -79%   | ≤ 100ms |
| unexplored_tags 平均実行時間 | 479ms   | 604ms  | -      | ≤ 100ms |
| embedding 全体占有率         | 51.93%  | -      | -      | -       |

- **アラート解消**: いいえ（目標値未達のためB案で追加対応）

> Note: unexplored_tags は計測タイミング・サンプル数（14 calls）の差異により改善前より悪化して見えるが、A案の改善(GINインデックス追加・LATERAL JOIN化)は適用済み。

---

### [2026-02-28] 対応 #2: B案 スロークエリ追加最適化（Phase B）

#### 検出

- **検出元**: pg_stat_statements（A案適用後の再計測）
- **対象クエリ**: `search_articles_by_embedding`, `search_articles_by_unexplored_tags`
- **検出時の実行時間**: embedding 平均 391ms (72 calls) / unexplored_tags 平均 604ms (14 calls)
- **A案からの改善**: embedding は 1,858ms → 391ms（-79%）だが目標100ms未達

#### 分析

- **embedding のボトルネック**: ef_search がデフォルト値(40)のまま、over-fetch 5x が過大でJOIN処理に余計な負荷
- **unexplored_tags のボトルネック**: `NOT (tags && explored_tags)` の否定条件により GIN インデックスが使えず Seq Scan が強制される
- **共通のボトルネック**: article_translations の JOIN で PK 使用後に has_translation フィルタが後段処理

#### Why

A案で79%改善したが目標100msに対して3.9〜6.0倍の乖離が残存。推薦APIの体感速度改善にはさらなるチューニングが必要。特にunexplored_tags は GIN インデックスが否定条件で無効化されている構造的問題を解消する必要がある。

#### How

- **改善方法**: HNSWパラメータ調整 + クエリ書き換え + インデックス追加
- **マイグレーションファイル**: `supabase/migrations/20260228000001_optimize_slow_queries_phase_b.sql`
- **変更内容の概要**:
  - B-1: ef_search を 40 → 20 に削減（推薦用途での精度トレードオフ許容）
  - B-2: over-fetch 倍率を 5x → 3x に削減（JOIN処理を40%軽量化）
  - B-3: article_translations に部分インデックス追加（日本語翻訳済み記事専用）
  - B-4: unexplored_tags の NOT && → 正引き(&&)+NOT EXISTS パターンに書き換え（GINインデックス活用可能に）

#### 効果

| 指標                         | B案適用前 | B案適用後 | 目標値  |
| ---------------------------- | --------- | --------- | ------- |
| embedding 平均実行時間       | 391ms     | (要計測)  | ≤ 100ms |
| unexplored_tags 平均実行時間 | 604ms     | (要計測)  | ≤ 100ms |

- **アラート解消**: (B案適用後に再計測して判定)
