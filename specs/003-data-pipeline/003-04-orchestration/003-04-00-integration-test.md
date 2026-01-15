# Subtask-003-04-00: コンポーネント結合テスト

## 概要

オーケストレーター実装前に、各コンポーネントが実際の外部サービス（SCP Data API、Supabase、OpenAI API、Gmail SMTP）と正しく連携できることを確認する。

## ユーザーストーリー

**As a** 開発者
**I want** 各コンポーネントの結合テストを実施する
**So that** オーケストレーター実装時に個々のコンポーネントが正しく動作することを前提にできる

## 前提条件

- 環境変数が設定済み（[環境変数設定手順書](../../../packages/pipeline/docs/env-setup.md) 参照）
- 以下のSubtaskが完了していること:
  - 003-02-02: EN全記事クローラー
  - 003-02-03: 差分更新機能
  - 003-03-01: バッチEmbedding処理
  - 003-03-03: タグ抽出本番化

## Acceptance Criteria（EARS記法）

### クローラー結合テスト（003-02-02, 003-02-03）

- [ ] WHEN EN全記事クローラーを実行した際
      GIVEN SCP Data APIが利用可能な場合
      THEN 記事一覧が正常に取得できる
      AND 記事本文が正常に取得できる

- [ ] WHEN クローラーでDB保存を実行した際
      GIVEN Supabaseが利用可能な場合
      THEN 記事がscp_articlesテーブルに保存される
      AND 重複実行時にUPSERTが正しく動作する

- [ ] WHEN 差分更新クローラーを実行した際
      GIVEN 既存データがある場合
      THEN 新規記事のみが追加される
      AND 更新された記事が更新される

### Embedding結合テスト（003-03-01）

- [ ] WHEN バッチEmbeddingを実行した際
      GIVEN OpenAI APIが利用可能な場合
      THEN Embeddingベクトルが生成される
      AND article_embeddingsテーブルに保存される

- [ ] WHEN レート制限に達した際
      GIVEN OpenAI APIが429を返す場合
      THEN リトライが正しく動作する

### タグ抽出結合テスト（003-03-03）

- [ ] WHEN タグ抽出を実行した際
      GIVEN OpenAI APIが利用可能な場合
      THEN タグが正しく抽出される
      AND article_tagsテーブルに保存される

- [ ] WHEN タグ辞書を参照した際
      GIVEN tag_dictionaryテーブルにデータがある場合
      THEN 辞書に存在するタグのみが付与される

### メール通知結合テスト（003-04-03用の事前確認）

- [ ] WHEN テストメールを送信した際
      GIVEN Gmail SMTPが設定済みの場合
      THEN メールが正常に送信される
      AND 送信元・送信先が正しい

## テスト実行手順

### 1. 環境変数の設定

```bash
cd packages/pipeline
cp .env.example .env
# .envを編集して実際の値を設定
```

### 2. クローラー結合テスト

```bash
# ドライラン（API疎通確認のみ、DB保存なし）
pnpm --filter pipeline test:integration:crawler --dry-run

# 本番テスト（少数記事でDB保存確認）
pnpm --filter pipeline test:integration:crawler --limit=10
```

### 3. Embedding結合テスト

```bash
# 少数記事でEmbedding生成テスト
pnpm --filter pipeline test:integration:embedding --limit=5
```

### 4. タグ抽出結合テスト

```bash
# 少数記事でタグ抽出テスト
pnpm --filter pipeline test:integration:tagging --limit=5
```

### 5. メール通知テスト

```bash
# テストメール送信
pnpm --filter pipeline test:integration:mail
```

## 確認項目チェックリスト

### SCP Data API

- [ ] 記事一覧取得（/pages）が200を返す
- [ ] 記事本文取得（/page/{id}）が200を返す
- [ ] レート制限時にRetry-Afterヘッダーが返る

### Supabase

- [ ] scp_articlesへのINSERTが成功する
- [ ] scp_articlesへのUPSERTが成功する
- [ ] article_embeddingsへのINSERTが成功する
- [ ] article_tagsへのINSERTが成功する
- [ ] tag_dictionaryからのSELECTが成功する

### OpenAI API

- [ ] text-embedding-3-small モデルでEmbedding生成が成功する
- [ ] gpt-4o-mini モデルでタグ抽出が成功する
- [ ] APIキーが有効で認証が成功する

### Gmail SMTP

- [ ] smtp.gmail.com:587への接続が成功する
- [ ] アプリパスワードでの認証が成功する
- [ ] テストメールの送信が成功する

## テスト結果記録

| テスト項目 | 結果 | 実施日 | 備考 |
|-----------|------|--------|------|
| クローラーAPI疎通 | - | - | - |
| クローラーDB保存 | - | - | - |
| 差分更新 | - | - | - |
| Embedding生成 | - | - | - |
| EmbeddingDB保存 | - | - | - |
| タグ抽出 | - | - | - |
| タグDB保存 | - | - | - |
| メール送信 | - | - | - |

## 注意事項

- 結合テストは**本番DBを使用する**ため、テストデータの管理に注意
- OpenAI APIは**課金が発生する**ため、limit指定で少数記事に制限
- Gmail SMTPは**送信制限**があるため、連続テストを避ける
- 問題発生時は、まずユニットテストで該当機能を確認してから結合テストを再実行

## 関連ドキュメント

- [環境変数設定手順書](../../../packages/pipeline/docs/env-setup.md)
- [003-02-02 EN全記事クローラー](../003-02-crawler/003-02-02-en-full-crawler.md)
- [003-03-01 バッチEmbedding](../003-03-processing/003-03-01-batch-embedding.md)
- [003-03-03 タグ抽出](../003-03-processing/003-03-03-tag-extraction.md)
