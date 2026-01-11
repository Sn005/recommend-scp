# Subtask-003-01-02: タグ辞書テーブル構築

## 概要

タグの正規化と多言語対応を実現するためのタグ辞書テーブルを構築する。
LLMプロンプトへのハードコーディングを排除し、DBベースでタグを管理する。

## ユーザーストーリー

**As a** 開発者
**I want** タグ辞書をDBで管理する
**So that** タグの表記揺れを防ぎ、多言語対応も容易になる

## Acceptance Criteria（EARS記法）

### タグ辞書テーブル

- [ ] WHEN マイグレーションを実行した際
      GIVEN Supabaseに接続できる場合
      THEN `tag_dictionary` テーブルが作成される
      AND 以下のカラムが含まれる：
        - `id` (SERIAL, PRIMARY KEY)
        - `category` (TEXT): 'object_class', 'genre', 'theme', 'format'
        - `canonical_value` (TEXT): 言語中立の正規値
        - `is_active` (BOOLEAN): 有効/無効フラグ
        - `created_at`, `updated_at` (TIMESTAMPTZ)
      AND `(category, canonical_value)` にユニーク制約がある

- [ ] WHEN タグローカライズテーブルを作成した際
      GIVEN `tag_dictionary` が存在する場合
      THEN `tag_localizations` テーブルが作成される
      AND 以下のカラムが含まれる：
        - `tag_id` (INTEGER, FK to tag_dictionary)
        - `lang` (TEXT, FK to supported_languages)
        - `localized_value` (TEXT): ローカライズされたタグ値
        - `aliases` (TEXT[]): 同義語リスト
      AND `(tag_id, lang)` が複合主キーになる

### 初期データ投入

- [ ] WHEN 初期データを投入した際
      GIVEN テーブルが存在する場合
      THEN object_class カテゴリに以下が登録される：
        - SAFE, EUCLID, KETER, THAUMIEL, NEUTRALIZED, APOLLYON, ARCHON
      AND genre カテゴリに以下が登録される：
        - HORROR, SCI_FI, FANTASY, COMEDY, TRAGEDY, MYSTERY, ACTION
      AND theme カテゴリに以下が登録される：
        - COGNITION, REALITY_BENDING, EXTRADIMENSIONAL, BIOLOGICAL, MECHANICAL, TEMPORAL, MEMETIC, ANTIMEMETIC
      AND format カテゴリに以下が登録される：
        - STANDARD, EXPLORATION_LOG, INTERVIEW, EXPERIMENT_LOG, TALE

- [ ] WHEN 英語ローカライズを投入した際
      GIVEN 初期データが存在する場合
      THEN 各タグに英語の `localized_value` と `aliases` が設定される
      AND 例: SAFE → localized_value: 'Safe', aliases: ['safe', 'SAFE']

### 同義語検索

- [ ] WHEN 同義語でタグを検索した際
      GIVEN aliases に 'safe' が含まれるタグがある場合
      THEN 正規値 'SAFE' が取得できる

## 設計

### tag_dictionary テーブル

```sql
CREATE TABLE tag_dictionary (
  id SERIAL PRIMARY KEY,
  category TEXT NOT NULL CHECK (category IN ('object_class', 'genre', 'theme', 'format')),
  canonical_value TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(category, canonical_value)
);

CREATE INDEX idx_tag_dictionary_category ON tag_dictionary(category);
```

### tag_localizations テーブル

```sql
CREATE TABLE tag_localizations (
  tag_id INTEGER REFERENCES tag_dictionary(id) ON DELETE CASCADE,
  lang TEXT REFERENCES supported_languages(code),
  localized_value TEXT NOT NULL,
  aliases TEXT[] DEFAULT '{}',
  PRIMARY KEY (tag_id, lang)
);

CREATE INDEX idx_tag_localizations_aliases ON tag_localizations USING GIN(aliases);
```

### 初期データ例

```sql
-- object_class
INSERT INTO tag_dictionary (category, canonical_value) VALUES
  ('object_class', 'SAFE'),
  ('object_class', 'EUCLID'),
  ('object_class', 'KETER');

-- 英語ローカライズ
INSERT INTO tag_localizations (tag_id, lang, localized_value, aliases)
SELECT id, 'en', 'Safe', ARRAY['safe', 'SAFE']
FROM tag_dictionary WHERE canonical_value = 'SAFE';
```

### 同義語検索クエリ

```sql
-- 同義語から正規値を取得
SELECT td.canonical_value
FROM tag_dictionary td
JOIN tag_localizations tl ON td.id = tl.tag_id
WHERE tl.lang = 'en'
  AND ('safe' = ANY(tl.aliases) OR tl.localized_value ILIKE 'safe');
```

## テストケース

- [ ] `tag_dictionary` テーブルが正常に作成される
- [ ] `tag_localizations` テーブルが正常に作成される
- [ ] 初期データ（object_class, genre, theme, format）が投入される
- [ ] 英語ローカライズが正しく設定される
- [ ] 同義語検索で正規値が取得できる
- [ ] 無効なカテゴリでINSERTするとエラーになる
- [ ] 重複する (category, canonical_value) でINSERTするとエラーになる
