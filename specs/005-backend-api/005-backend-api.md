# EPIC-005: バックエンドAPI

## 概要

Hono独立サーバーによるバックエンドAPIを実装し、フロントエンドとの通信基盤を構築する。
サーバー主導アーキテクチャにより、推薦計算・データ永続化をサーバー側で一元管理する。

## ステータス

- **status**: planned

## ユーザーストーリー

**ペルソナ**: SCP記事を読むエンドユーザー / フロントエンドアプリケーション
**目的**: 推薦システムのAPIを通じて記事を検索・取得し、フィードバックを記録する
**価値**: クライアントとサーバーの責務分離により、スケーラブルで型安全な通信を実現
**理由**: 推薦計算をサーバー側に集約し、クライアントは表示に専念できるようにする

## 背景

### clarifyで言語化済みの設計決定

| 項目         | 決定内容                                                 |
| ------------ | -------------------------------------------------------- |
| サーバー構成 | Hono独立サーバー（Railway デプロイ）                     |
| 責務分配     | サーバー主導アーキテクチャ（推薦計算はサーバー側）       |
| 認証         | visitorId（クライアント生成UUID）→ 将来Supabase Auth連携 |
| 型共有       | Hono RPC型共有（packages/api-types）                     |
| エラー形式   | RFC 7807 Problem Details                                 |
| 性能目標     | 200ms以下レスポンス                                      |
| ロギング     | pino使用（console.log禁止）                              |
| テスト       | 単体テスト必須 + E2E（AC準拠）                           |
| 記事詳細     | WebView表示（詳細APIは不要）                             |

### EPIC-004からのアーキテクチャ変更

EPIC-004ではクライアント側ストレージ（IndexedDB）を想定していたが、
本EPICでサーバー主導アーキテクチャに移行する。

| 項目              | EPIC-004（当初）          | EPIC-005（変更後）        |
| ----------------- | ------------------------- | ------------------------- |
| ストレージ        | IndexedDB（クライアント） | Supabase（サーバー）      |
| 推薦計算          | クライアント側            | サーバー側                |
| データ永続化      | ブラウザローカル          | PostgreSQL                |
| PreferenceStorage | IndexedDBStorage          | SupabasePreferenceStorage |

**注**: IndexedDB実装は将来のPWAオフラインモード用として保持。

## 主要機能

### 1. MVPエンドポイント

| ドメイン   | メソッド | パス                 | 説明                 |
| ---------- | -------- | -------------------- | -------------------- |
| visitors   | POST     | `/visitors`          | visitorId登録        |
| articles   | GET      | `/articles/search`   | ベクトル検索         |
| recommend  | POST     | `/recommend`         | 推薦取得             |
| feedback   | POST     | `/feedback`          | Like/Dislike記録     |
| onboarding | GET      | `/onboarding/packs`  | スターターパック一覧 |
| onboarding | POST     | `/onboarding/select` | パック選択・初期化   |

### 2. ドメイン別Colocationパターン

```
apps/api-server/src/domains/[domain]/
├── routes.ts      # APIエンドポイント定義
├── service.ts     # ビジネスロジック
├── repository.ts  # DB操作層
├── schema.ts      # Zodバリデーション
└── __dev__/
    └── routes.test.ts
```

### 3. サーバー側ストレージ実装

EPIC-004で定義した `PreferenceStorage` / `VectorSearchClient` インターフェースの
Supabase実装を提供し、推薦ロジック（RecommendationEngine等）をサーバー側で動作させる。

### 4. recommend API vs articles API の使い分け

| 観点             | recommend API                             | articles API                  |
| ---------------- | ----------------------------------------- | ----------------------------- |
| **目的**         | パーソナライズド推薦                      | テキスト検索                  |
| **入力**         | visitorId                                 | 検索クエリ（テキスト）        |
| **認証**         | visitorId必須、オンボーディング完了が前提 | 認証不要                      |
| **ロジック**     | RecommendationEngine（80/20ルール）       | クエリ→Embedding→ベクトル検索 |
| **ユースケース** | ホーム画面のスワイプUI、「次の記事」      | 検索バー、キーワード検索      |

**使い分けの原則:**

- **recommend**: システム主導（パッシブ）。ユーザーの過去の行動履歴から「次に見たい記事」を予測
- **articles/search**: ユーザー主導（アクティブ）。明確な意図がある時に使用

### 5. articles/search のセマンティック検索

検索クエリはSQLの`LIKE`や全文検索ではなく、**セマンティック検索（意味的類似度検索）** を使用する。

```
ユーザー入力: "ホラー系のscp"
       ↓
① OpenAI Embeddings API（text-embedding-3-small）でベクトル化
       ↓
クエリベクトル: [0.12, -0.34, 0.56, ...]（1536次元）
       ↓
② pgvector コサイン類似度検索
       ↓
意味的に類似した記事を返す
```

**対応可能なクエリ例:**

| クエリ例             | 動作                                           |
| -------------------- | ---------------------------------------------- |
| "ホラー系のscp"      | 「ホラー」「怖い」「不気味」等の意味を含む記事 |
| "かわいい生物"       | SCP-999など「癒し系」記事                      |
| "閉じ込められる恐怖" | SCP-087など「閉所恐怖」的な記事                |

Embeddingが**意味を捉える**ため、キーワード一致ではなく意味的類似性で検索できる。

**多言語・表記揺れ対応:**

text-embedding-3-smallは多言語に対応しているため、以下のクエリも同様に機能する:

| クエリ例                       | 説明                               |
| ------------------------------ | ---------------------------------- |
| "じんるいぜつめつ"             | ひらがなでも意味を捉える           |
| "human extinction"             | 英語クエリも対応                   |
| "終末シナリオ"、"アポカリプス" | 類似概念は同じ意味空間にマッピング |

### 6. フロントエンドへの推奨事項（EPIC-006）

ユーザーが「キーワード完全一致」だと誤解しないよう、検索UIに説明を追加すること。

**推奨UI例:**

```
┌─────────────────────────────────────────────────┐
│ 🔍 [                                    ] [検索] │
│                                                 │
│ 💡 「ホラー系」「かわいい生物」など              │
│    雰囲気や特徴で検索できます                   │
└─────────────────────────────────────────────────┘
```

**UIガイドライン:**

- プレースホルダー例: `"怖い話"、"かわいい生物"など雰囲気で検索`
- ヘルプテキスト: キーワード一致ではなく「意味」で検索する旨を説明
- 具体例を提示: ユーザーが検索方法を直感的に理解できるようにする

## Acceptance Criteria（EPIC レベル）

### AC-1: API基盤

- [ ] WHEN APIサーバーが起動した際
      THEN Honoサーバーが指定ポートでリクエストを受け付ける
      AND ヘルスチェックエンドポイントが200を返す

### AC-2: エラーハンドリング

- [ ] WHEN APIエラーが発生した際
      THEN システムはRFC 7807 Problem Details形式でレスポンスを返す
      AND type, title, status, detail フィールドを含める

### AC-3: visitors API

- [ ] WHEN クライアントがvisitorIdを送信した際
      THEN システムはvisitorを登録/取得する
      AND 適切なHTTPステータスを返す

### AC-4: articles API

- [ ] WHEN ユーザーが検索クエリを送信した際
      THEN システムはベクトル検索で類似記事を取得する
      AND 200ms以内にレスポンスを返す

### AC-5: recommend API

- [ ] WHEN クライアントが推薦をリクエストした際
      GIVEN visitorIdが登録済みでプロファイルが存在する場合
      THEN システムはRecommendationEngineを呼び出し推薦記事を返す

### AC-6: feedback API

- [ ] WHEN ユーザーがLike/Dislikeフィードバックを送信した際
      THEN システムはフィードバックを記録する
      AND 嗜好プロファイルを更新する

### AC-7: onboarding API

- [ ] WHEN ユーザーがスターターパックを選択した際
      THEN システムは初期プロファイルを生成する
      AND onboardingCompletedAtを設定する

### AC-8: 型共有

- [ ] WHEN フロントエンドがAPIを呼び出す際
      THEN Hono RPCにより型安全な通信が可能である
      AND packages/api-typesからAppTypeをインポートできる

### AC-9: パフォーマンス

- [ ] WHILE 全APIエンドポイントがリクエストを処理する際
      THE SYSTEM SHALL P95レスポンスタイムが200ms以下である
      AND P99レスポンスタイムが500ms以下である

### AC-10: セキュリティ

- [ ] WHILE リクエストを処理する際
      THE SYSTEM SHALL 入力値をZodでバリデーションする
      AND 不正な入力に対して400 Bad Requestを返す

- [ ] WHEN 必須環境変数（SUPABASE_URL, SUPABASE_ANON_KEY等）が未設定の場合
      THEN サーバー起動時にエラーを出力する
      AND プロセスを終了する

- [ ] WHILE CORSを処理する際
      THE SYSTEM SHALL 許可されたオリジンからのリクエストのみ受け付ける

## Story 一覧

| ID                                          | 名前                 | 概要                                                 | ステータス |
| ------------------------------------------- | -------------------- | ---------------------------------------------------- | ---------- |
| [005-01](./005-01-api-foundation/005-01.md) | API基盤構築          | Honoサーバー初期化、ミドルウェア、エラーハンドリング | planned    |
| [005-02](./005-02-server-storage/005-02.md) | サーバー側ストレージ | PreferenceStorage/VectorSearchClientのSupabase実装   | planned    |
| [005-03](./005-03-visitors-api/005-03.md)   | visitors API         | visitorId登録エンドポイント                          | planned    |
| [005-04](./005-04-articles-api/005-04.md)   | articles API         | ベクトル検索エンドポイント                           | planned    |
| [005-05](./005-05-recommend-api/005-05.md)  | recommend API        | 推薦取得エンドポイント                               | planned    |
| [005-06](./005-06-feedback-api/005-06.md)   | feedback API         | Like/Dislike記録エンドポイント                       | planned    |
| [005-07](./005-07-onboarding-api/005-07.md) | onboarding API       | スターターパック一覧・選択エンドポイント             | planned    |
| [005-08](./005-08-api-types/005-08.md)      | 型共有パッケージ     | packages/api-typesでRPC型をexport                    | planned    |
| [005-09](./005-09-docs-update/005-09.md)    | ドキュメント更新     | アーキテクチャ変更の反映                             | planned    |

## 技術設計

### ディレクトリ構成

```
apps/api-server/
├── src/
│   ├── index.ts              # エントリーポイント
│   ├── app.ts                # Honoアプリ定義
│   ├── middleware/
│   │   ├── error-handler.ts  # RFC 7807エラーハンドリング
│   │   ├── logger.ts         # pinoリクエストログ
│   │   └── cors.ts           # CORS設定
│   ├── lib/
│   │   ├── problem-details.ts
│   │   ├── supabase.ts
│   │   └── storage/
│   │       ├── supabase-preference-storage.ts
│   │       └── supabase-vector-search.ts
│   └── domains/
│       ├── visitors/
│       ├── articles/
│       ├── recommend/
│       ├── feedback/
│       └── onboarding/
├── package.json
├── tsconfig.json
└── vitest.config.ts

packages/api-types/
├── src/
│   └── index.ts              # AppType export
├── package.json
└── tsconfig.json
```

### DBスキーマ（新規テーブル）

```sql
-- visitors テーブル
CREATE TABLE visitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES auth.users,
  preference_vector vector(1536),
  tag_weights JSONB DEFAULT '{}',
  object_class_preference JSONB DEFAULT '{}',
  starter_pack TEXT,
  onboarding_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- view_history テーブル
CREATE TABLE view_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id TEXT NOT NULL REFERENCES visitors(visitor_id),
  article_id TEXT NOT NULL,
  viewed_at TIMESTAMPTZ DEFAULT now(),
  duration INTEGER
);

-- feedback テーブル
CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id TEXT NOT NULL REFERENCES visitors(visitor_id),
  article_id TEXT NOT NULL,
  type TEXT CHECK (type IN ('like', 'dislike')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (visitor_id, article_id)
);

-- recommendation_log テーブル
CREATE TABLE recommendation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id TEXT NOT NULL REFERENCES visitors(visitor_id),
  article_id TEXT NOT NULL,
  source TEXT CHECK (source IN ('preference', 'serendipity')),
  recommended_at TIMESTAMPTZ DEFAULT now(),
  clicked BOOLEAN DEFAULT false
);

-- favorites テーブル
CREATE TABLE favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id TEXT NOT NULL REFERENCES visitors(visitor_id),
  article_id TEXT NOT NULL,
  added_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (visitor_id, article_id)
);
```

### 依存フロー

```
routes.ts
    ↓ (Zodバリデーション)
service.ts
    ↓ (ビジネスロジック)
    ├── packages/shared (RecommendationEngine, OnboardingService等)
    └── repository.ts
            ↓
        Supabase
```

## 依存関係

- **EPIC-003**: データパイプライン本番化（記事データ・タグデータ）
- **EPIC-004**: 推薦ロジック実装（RecommendationEngine, OnboardingService等）

## 参照ドキュメント

- [アーキテクチャ定義](/.ai/architecture.md)
- [コーディングガイドライン](/.ai/coding-guidelines.md)
- [EPIC-004: 推薦ロジック実装](../004-recommend/004-recommend.md)
