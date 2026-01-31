# /clarify 結果: 記事表示・閲覧履歴の要件明確化

**実施日**: 2026-01-31
**対象**: 記事表示方式、日本語記事データ、閲覧履歴

---

## トレードオフ分析

| 観点 | 選択肢A | 選択肢B | 決定 | 理由 |
|------|---------|---------|------|------|
| 記事表示 | アプリ内表示（本文DB保存） | WebView（外部サイト） | B | 実装コスト削減 |
| 日本語URL | クローラーで取得 | 既存データから生成 | B | 法則性あり、SQL一発 |
| 翻訳有無管理 | 専用カラム（url_ja, has_ja） | 別テーブル | B | 多言語拡張性 |
| 翻訳判定 | バッチで事前確認 | 初回アクセス時 | B | 実装コスト削減 |
| 本文抽出 | DB保存（クローラー） | 閲覧時WebViewから抽出 | B | コスパ重視 |
| 404時 | エラー画面 | 別記事サジェスト | B | UX向上 |

---

## 決定事項サマリー

### 定義

- **見やすい閲覧履歴**: タイトル + 本文冒頭があり、何の記事だったか思い出せる状態
- **コスパ**: 金銭コスト + 実装コストの両方を抑える

### 基本方針

1. **記事表示**: WebView（scp-jp.wikidot.com）を使用
2. **日本語URL**: 既存データから法則的に生成（`http://scp-jp.wikidot.com/{article_id}`）
3. **翻訳有無**: 初回アクセス時に判定し、DBに記録
4. **閲覧履歴**: WebViewから本文冒頭を抽出し、ローカルストレージに保存

### 技術的制約

- Supabase無料枠（500MB）内に収める
- 日本語クローラーは実装しない（MVP）
- 本文のDB保存は行わない（コスト削減）

### MVPスコープ

**含む:**

- `article_translations` テーブル（多言語対応設計）
- 日本語URL生成（SQL一括実行）
- WebView表示 + 404検知
- 翻訳なし時のサジェスト画面
- 閲覧時の本文抽出 → ローカルストレージ保存

**含まない（将来対応）:**

- 日本語クローラー
- 日本語本文のDB保存
- バッチでの翻訳有無事前確認
- 他言語対応（韓国語、中国語など）

---

## 新規テーブル設計

```sql
CREATE TABLE article_translations (
  article_id TEXT NOT NULL,      -- "SCP-173"
  lang TEXT NOT NULL,            -- "ja", "ko", "cn"
  url TEXT NOT NULL,             -- 各言語版URL
  has_translation BOOLEAN DEFAULT NULL,  -- NULL:未確認, TRUE:あり, FALSE:なし
  checked_at TIMESTAMPTZ,        -- 確認日時
  PRIMARY KEY (article_id, lang)
);

-- 初期データ投入（日本語）
INSERT INTO article_translations (article_id, lang, url)
SELECT article_id, 'ja', 'http://scp-jp.wikidot.com/' || LOWER(article_id)
FROM scp_articles WHERE lang = 'en';
```

---

## 閲覧履歴データ構造

```typescript
interface HistoryEntry {
  scpNumber: string;        // "SCP-173"
  title: string;            // "彫刻 - オリジナル"（WebViewから抽出）
  excerpt: string;          // 本文冒頭50文字（WebViewから抽出）
  objectClass: ObjectClass; // "Euclid"
  viewedAt: string;         // ISO8601
}
```

---

## フロー図

### 記事表示フロー

```
[推薦API]
    │
    ├─ JOIN article_translations ON lang = 'ja'
    │
    └─ WHERE has_translation IS NULL OR has_translation = TRUE
           ↓
[フロントエンド: WebView表示]
           ↓
    ┌──────────────┬─────────────────────┐
    │ 成功         │ 404検知             │
    ├──────────────┼─────────────────────┤
    │ 1. 本文抽出  │ 1. API呼び出し      │
    │ 2. タイトル  │    has_translation  │
    │    抽出      │    = FALSE に更新   │
    │ 3. ローカル  │ 2. サジェスト画面   │
    │    保存      │    表示             │
    │ 4. 閲覧継続  │ 3. 別記事を提案     │
    └──────────────┴─────────────────────┘
```

### 翻訳なし時のUI

```
┌─────────────────────────────────┐
│                                 │
│   この記事の日本語訳は          │
│   まだ公開されていません        │
│                                 │
│   ┌─────────────────────┐      │
│   │  別の記事をおすすめ  │      │
│   └─────────────────────┘      │
│                                 │
└─────────────────────────────────┘
```

---

## 影響を受けるSpec

| Spec ID | 名前 | 影響内容 |
|---------|------|----------|
| 006-02-02 | WebViewコンポーネント | 日本語URL使用、404検知、本文抽出 |
| 006-04-01 | 履歴記録機能 | excerpt フィールド追加 |
| 005-05 | 推薦API | article_translations JOIN、url返却 |
| 新規 | article_translations | テーブル追加マイグレーション |

---

## /spec 引き継ぎ情報

### ユーザーストーリー素案

> SCPファンとして、日本語で記事を読んで、後で「何の記事だったか」思い出せるようにしたい。

### AC候補

- [ ] 推薦APIが日本語版URLを返す
- [ ] WebViewでscp-jp.wikidot.comの記事を表示できる
- [ ] 翻訳がない場合、別記事をサジェストする画面が表示される
- [ ] 閲覧履歴に本文冒頭が表示される
- [ ] 翻訳有無がDBに記録され、次回から翻訳なし記事は推薦されない

### 設計制約

- `article_translations` テーブルで多言語対応設計
- 本文抽出はクライアントサイドで実行（サーバー負荷なし）
- 翻訳判定は遅延評価（初回アクセス時）

### 参照

- 元の要件: WebView表示、日本語記事URL、閲覧履歴の見やすさ
- clarifyセッション: 2026-01-31
