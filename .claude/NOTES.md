# NOTES.md

プロジェクトの学習記録・改善提案・技術的なメモを記録するファイルです。

---

## CI/CD でのSupabaseマイグレーション対応

### 概要

GitHub ActionsでSupabaseマイグレーションを自動適用し、環境差分（dev/staging/prod）に対応する。

### 環境構成

| 環境    | 用途         | Supabase Project               |
| ------- | ------------ | ------------------------------ |
| dev     | 開発・テスト | ローカル or 開発用プロジェクト |
| staging | 統合テスト   | ステージング用プロジェクト     |
| prod    | 本番         | 本番用プロジェクト             |

### GitHub Actions ワークフロー

#### 1. マイグレーションテスト（PR時）

```yaml
# .github/workflows/migration-test.yml
name: Migration Test

on:
  pull_request:
    paths:
      - "supabase/migrations/**"

jobs:
  test-migration:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1
        with:
          version: latest

      - name: Start Supabase Local
        run: |
          supabase init --workdir . || true
          supabase start

      - name: Apply Migrations
        run: supabase db reset

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Install dependencies
        run: pnpm install

      - name: Run Migration Tests
        run: pnpm test packages/poc/src/migrations/__dev__/
        env:
          SUPABASE_URL: http://127.0.0.1:54321
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_LOCAL_SERVICE_KEY }}

      - name: Stop Supabase
        if: always()
        run: supabase stop
```

#### 2. マイグレーション適用（マージ時）

```yaml
# .github/workflows/migration-deploy.yml
name: Deploy Migrations

on:
  push:
    branches:
      - main
    paths:
      - "supabase/migrations/**"

jobs:
  deploy-staging:
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4

      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1

      - name: Link to Staging Project
        run: |
          supabase link --project-ref ${{ secrets.SUPABASE_STAGING_PROJECT_REF }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}

      - name: Push Migrations to Staging
        run: supabase db push
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}

  deploy-prod:
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4

      - name: Setup Supabase CLI
        uses: supabase/setup-cli@v1

      - name: Link to Production Project
        run: |
          supabase link --project-ref ${{ secrets.SUPABASE_PROD_PROJECT_REF }}
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}

      - name: Push Migrations to Production
        run: supabase db push
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
```

### 必要なSecrets

| Secret名                       | 説明                         | 設定場所       |
| ------------------------------ | ---------------------------- | -------------- |
| `SUPABASE_ACCESS_TOKEN`        | Supabase CLI認証トークン     | GitHub Secrets |
| `SUPABASE_STAGING_PROJECT_REF` | ステージング環境のProject ID | GitHub Secrets |
| `SUPABASE_PROD_PROJECT_REF`    | 本番環境のProject ID         | GitHub Secrets |
| `SUPABASE_LOCAL_SERVICE_KEY`   | ローカルテスト用（固定値）   | GitHub Secrets |

### Supabase Access Token取得方法

1. https://supabase.com/dashboard/account/tokens にアクセス
2. 「Generate new token」をクリック
3. トークン名を入力して生成
4. GitHub Secretsに `SUPABASE_ACCESS_TOKEN` として保存

### 環境別設定ファイル（オプション）

```bash
# supabase/config.toml を環境別に分ける場合
supabase/
├── config.toml          # 共通設定
├── config.staging.toml  # ステージング固有
└── config.prod.toml     # 本番固有
```

### マイグレーション命名規則

```
YYYYMMDDHHMMSS_description.sql
```

例:

- `20250112000001_language_schema.sql`
- `20250113000001_tag_dictionary.sql`

### ロールバック対応

Supabaseはダウンマイグレーションを直接サポートしていないため、以下の方法で対応：

1. **新しいマイグレーションで修正**（推奨）

   ```sql
   -- 20250114000001_fix_language_schema.sql
   ALTER TABLE supported_languages DROP COLUMN IF EXISTS deprecated_column;
   ```

2. **手動ロールバックスクリプト**
   ```bash
   supabase/rollbacks/
   └── 20250112000001_language_schema_rollback.sql
   ```

### 実装優先度

| 優先度 | 項目                             | 状態   |
| ------ | -------------------------------- | ------ |
| P0     | PR時のマイグレーションテスト     | 未実装 |
| P1     | staging自動デプロイ              | 未実装 |
| P2     | prod自動デプロイ（手動承認付き） | 未実装 |
| P3     | ロールバック自動化               | 未実装 |

### 関連Subtask

- **003-04**: CI/CDパイプライン構築（このドキュメントの内容を実装予定）

---

## 本格実装に向けた改善案

### タグ辞書方式の導入（優先度: 高）

現在のタグ抽出はLLMプロンプトにタグ選択肢をハードコーディングしているが、本格実装では**DBでタグ辞書を管理**する方式を採用する。

**メリット:**

- 表記揺れ防止（辞書にあるタグのみ許可）
- 拡張性（新タグはDB追加のみでコード変更不要）
- 日本語化対応（辞書を日本語に変更するだけ）
- 同義語管理（`horror` → `ホラー` のマッピング）

**実装案:**

```sql
CREATE TABLE tag_dictionary (
  id SERIAL PRIMARY KEY,
  category TEXT NOT NULL,  -- 'object_class', 'genre', 'theme', 'format'
  value TEXT NOT NULL,     -- '安全', 'ホラー' など（日本語）
  aliases TEXT[],          -- ['Safe', 'safe'] など（同義語）
  description TEXT,
  UNIQUE(category, value)
);
```

**プロンプト生成:**

```typescript
const dictionary = await fetchTagDictionary();
const prompt = `タグを以下から選択: ${dictionary.genre.join(" | ")}`;
```

### 多言語支部対応の拡張性設計（優先度: 中）

EPIC-003（データパイプライン本番化）では、将来の多言語支部対応（KO, CN, FR等）を見据えた拡張性を担保する。

**設計方針:**

| 項目         | 拡張性担保の方法                                                   |
| ------------ | ------------------------------------------------------------------ |
| 言語マスタ   | `supported_languages` テーブルで管理。新言語は1行INSERT            |
| 記事テーブル | `scp_articles.lang` は TEXT型で任意言語コード対応                  |
| クローラー   | `BranchCrawler` インターフェースで抽象化。支部別実装を差し替え可能 |
| タグ辞書     | `tag_localizations` テーブルで言語別ローカライズを分離管理         |

**新言語追加時の作業:**

1. `supported_languages` に1行追加
2. 新しい `XxxCrawler` クラス実装（〜200行）
3. `tag_localizations` にローカライズ追加
4. パイプライン設定で `lang: 'xx'` 指定

**見積もり:** 1-2日程度で新言語対応可能

---

## EPIC-004: ユーザー嗜好データのストレージ設計

> **参照タイミング:** EPIC-004「推薦ロジック実装」の仕様策定時

### 背景・要件

- ユーザー登録なしで使いたい（ゲスト利用）
- 嗜好データはローカルに保存
- Web PWA → Capacitor への移行を予定

### プラットフォーム計画

```
Phase 1: Web PWA（ローカル保存のみ）
Phase 2: Capacitor でネイティブアプリ化
Phase 3: オプションでサーバー同期（アカウント作成時）
```

### 推奨ストレージ方式: IndexedDB + 抽象化レイヤー

```
┌────────────────────────────────────────────────┐
│           Storage Abstraction Layer            │
│  ┌──────────────────────────────────────────┐  │
│  │      PreferenceStorage interface         │  │
│  └──────────────────────────────────────────┘  │
│         ↓                    ↓                 │
│  ┌─────────────┐      ┌─────────────────┐     │
│  │  IndexedDB  │      │ @capacitor/     │     │
│  │  (PWA)      │      │ preferences     │     │
│  └─────────────┘      └─────────────────┘     │
└────────────────────────────────────────────────┘
```

**選定理由:**

- IndexedDB は PWA でも Capacitor でもそのまま動作
- 抽象化レイヤーを挟めば後から SQLite 等への移行も容易
- Capacitor の `@capacitor/preferences` は軽量データ向け

### データモデル案

```typescript
/** ユーザー嗜好データ（ローカル保存） */
interface UserPreference {
  visitorId: string; // 匿名ID（UUID）
  createdAt: string;
  updatedAt: string;
}

/** 閲覧履歴 */
interface ViewHistory {
  visitorId: string;
  articleId: string; // "scp-173" など
  viewedAt: string;
  duration?: number; // 滞在時間（秒）
}

/** フィードバック */
interface Feedback {
  visitorId: string;
  articleId: string;
  type: "like" | "dislike" | "bookmark" | "skip";
  createdAt: string;
}

/** 計算された嗜好プロファイル */
interface PreferenceProfile {
  visitorId: string;
  tagWeights: Record<string, number>; // { "ホラー": 0.8, "安全": 0.3 }
  objectClassPreference: Record<string, number>;
  updatedAt: string;
}

/** レコメンド履歴（重複防止・ε-greedy用） */
interface RecommendationLog {
  visitorId: string;
  articleId: string;
  recommendedAt: string;
  source: "similar" | "explore" | "popular";
  clicked: boolean;
}
```

### IndexedDB スキーマ設計

```typescript
const DB_NAME = "scp-recommend";
const DB_VERSION = 1;

const stores = {
  preferences: {
    keyPath: "visitorId",
  },
  viewHistory: {
    keyPath: "id", // `${visitorId}_${articleId}_${timestamp}`
    indexes: [
      { name: "byVisitor", keyPath: "visitorId" },
      { name: "byArticle", keyPath: "articleId" },
      { name: "byDate", keyPath: "viewedAt" },
    ],
  },
  feedback: {
    keyPath: "id", // `${visitorId}_${articleId}`
    indexes: [
      { name: "byVisitor", keyPath: "visitorId" },
      { name: "byType", keyPath: "type" },
    ],
  },
  recommendationLog: {
    keyPath: "id",
    indexes: [
      { name: "byVisitor", keyPath: "visitorId" },
      { name: "byDate", keyPath: "recommendedAt" },
    ],
  },
};
```

### 容量見積もり

| データ           | 1件あたり | 想定件数 | 合計   |
| ---------------- | --------- | -------- | ------ |
| 閲覧履歴         | ~100B     | 1,000件  | ~100KB |
| フィードバック   | ~80B      | 500件    | ~40KB  |
| レコメンド履歴   | ~120B     | 2,000件  | ~240KB |
| 嗜好プロファイル | ~2KB      | 1件      | ~2KB   |

**合計: ~400KB**（localStorage/IndexedDB の制限内で余裕）

### 実装フェーズ

| Phase | 内容                   | ストレージ                      |
| ----- | ---------------------- | ------------------------------- |
| 1     | PWA（ローカルのみ）    | IndexedDB + 匿名UUID            |
| 2     | Capacitor 移行         | 同じ IndexedDB コードが動作     |
| 3     | 同期機能（オプション） | Supabase にアカウント連携で同期 |

### 関連する実装タスク

- `packages/shared/src/storage/` にストレージ抽象化レイヤー実装
- `packages/shared/src/types/preference.ts` に型定義
- ε-greedy 推薦ロジックとの統合（EPIC-004）
