# EPIC-010: 日本語記事表示・閲覧履歴改善

## 概要

SCP記事を日本語版サイト（scp-jp.wikidot.com）のURLでWebView表示し、閲覧履歴に本文冒頭を追加して「何の記事だったか」を思い出しやすくする改善。

## 背景

### 現状の課題

1. **記事URLが保存されていない**: クローラーでURLを取得しているが、DBに保存していない
2. **日本語対応なし**: 英語版URLしか想定されていない
3. **閲覧履歴が不十分**: タイトルのみでは記事内容を思い出しにくい

### 解決策

1. `article_translations` テーブルで多言語URL管理
2. 既存データから日本語版URLを法則的に生成
3. 閲覧時にWebViewから本文を抽出し、ローカルストレージに保存

## ユーザーストーリー

**ペルソナ**: SCPファン（初心者〜上級者）
**目的**: 日本語で記事を読み、後で「何の記事だったか」思い出せるようにする
**価値**: 言語の壁なくSCPコンテンツを楽しめる
**理由**: 英語版URLでは日本語ユーザーにとって不便、履歴がタイトルのみでは記事を思い出しにくい

> SCPファンとして、日本語で記事を読み、後で「何の記事だったか」思い出せるようにしたい。なぜなら言語の壁なくSCPコンテンツを楽しみたいから。

## Acceptance Criteria

### AC-1: 日本語URL管理

- [x] WHEN システムが初期化される際
      GIVEN `article_translations` テーブルが存在しない場合
      THEN マイグレーションでテーブルを作成する
      AND 既存の英語版記事から日本語URLを一括生成する

### AC-2: 推薦APIでのURL提供

- [x] WHEN 推薦APIが記事を返す際
      GIVEN 日本語翻訳がある（または未確認の）記事の場合
      THEN レスポンスに `url` フィールドを含める

### AC-3: 翻訳なし記事の除外

- [x] WHEN 推薦APIが記事を選択する際
      GIVEN `has_translation = FALSE` の記事がある場合
      THEN その記事を推薦候補から除外する

### AC-4: WebView日本語表示

- [x] WHEN 記事をWebViewで表示する際
      THEN 日本語版URL（scp-jp.wikidot.com）を使用する

### AC-5: 404検知とサジェスト

- [x] WHEN WebViewで404エラーが発生した際
      THEN DBの `has_translation` を FALSE に更新する
      AND サジェスト画面を表示する

### AC-6: 本文抽出と履歴保存

- [x] WHEN 記事をWebViewで正常に表示した際
      THEN 本文冒頭50文字とタイトルを抽出する
      AND ローカルストレージに保存する

### AC-7: 閲覧履歴での本文表示

- [x] WHEN 閲覧履歴画面を表示する際
      THEN 各エントリにタイトルと本文冒頭を表示する

## 関連Story

| ID                                           | 名前                  | 概要                         | ステータス |
| -------------------------------------------- | --------------------- | ---------------------------- | ---------- |
| [010-01](./010-01-url-management/010-01.md)  | 日本語記事URL管理     | テーブル作成・データ投入     | completed  |
| [010-02](./010-02-api-extension/010-02.md)   | 推薦API日本語対応     | url追加・翻訳有無API         | completed  |
| [010-03](./010-03-webview-ja/010-03.md)      | WebView日本語記事表示 | 日本語URL・404検知・本文抽出 | completed  |
| [010-04](./010-04-history-excerpt/010-04.md) | 閲覧履歴本文表示      | excerpt追加                  | completed  |

## 技術設計

### 新規テーブル

```sql
CREATE TABLE article_translations (
  article_id TEXT NOT NULL,
  lang TEXT NOT NULL,
  url TEXT NOT NULL,
  has_translation BOOLEAN DEFAULT NULL,
  checked_at TIMESTAMPTZ,
  PRIMARY KEY (article_id, lang)
);
```

### インターフェース変更

```typescript
// RecommendedArticle に url 追加
interface RecommendedArticle {
  id: string;
  title: string;
  similarityScore: number;
  source: "preference" | "serendipity";
  url: string; // 追加
}

// HistoryEntry に excerpt 追加
interface HistoryEntry {
  scpNumber: string;
  title: string;
  excerpt: string; // 追加
  objectClass: ObjectClass;
  viewedAt: string;
}
```

## 依存関係

- **前提**: EPIC-005（バックエンドAPI）, EPIC-006（フロントエンドUI）
- **参照**: [clarify結果](../006-frontend/clarify-article-requirements.md)

## 実装状況

- **status**: completed
