---
id: "009-02-01"
epic_id: "009"
story_id: "009-02"
epic_title: "セキュリティ強化"
story_title: "API入力バリデーション強化"
title: "Zodスキーマ制約強化"
status: "pending"
created_at: "2026-02-15"
updated_at: "2026-02-15"
completed_at: null
---

# Subtask: Zodスキーマ制約強化

## 親Story

[009-02: API入力バリデーション強化](./009-02.md)

## ユーザーストーリー

**ペルソナ**: システム運用者
**目的**: 全ドメインのZodスキーマに文字列長制限・パターン制限を追加する
**価値**: 過度に長い入力や不正文字列の注入をバリデーション層で確実にブロックする
**理由**: 現状のスキーマは型レベルの検証のみで、攻撃的な入力パターンに対する防御が不十分

> システム運用者として、全ドメインのZodスキーマに文字列長・パターン制限を追加して、不正入力をバリデーション層でブロックしたい。なぜなら現状は型レベルのみの検証で防御が不十分だから。

## Acceptance Criteria

### AC-1: articleIdの制約追加

- [ ] WHEN articleIdフィールドを含むリクエストが送信される際
      THE SYSTEM SHALL 最大100文字の長さ制限を適用する
      AND 英数字・ハイフン・アンダースコアのみを許可するパターン制限を適用する

- [ ] WHEN articleIdに不正な文字（例: `<script>`, スペース, 日本語）が含まれる場合
      THEN 400 Bad RequestをRFC 7807形式で返す

### AC-2: 検索クエリの制約追加

- [ ] WHEN 検索クエリ（q）フィールドが送信される際
      THE SYSTEM SHALL 最大200文字の長さ制限を適用する（既存のmin: 2は維持）

### AC-3: メタデータの制約追加

- [ ] WHEN フィードバックのmetadata.dwellTimeが送信される際
      THE SYSTEM SHALL 最大86400（24時間）の上限制限を適用する

### AC-4: 既存テストの維持

- [ ] WHEN 制約追加後に `pnpm test` を実行した際
      THEN 全既存テストがパスする

### AC-5: 新規バリデーションテスト

- [ ] 追加した各制約に対して、境界値テスト（正常値・境界値・異常値）が存在する

## 設計

### 変更対象ファイルと追加制約

#### articles/schema.ts

```typescript
// 変更前
q: z.string().min(2);
// 変更後
q: z.string().min(2).max(200);
```

#### feedback/schema.ts

```typescript
// 変更前
articleId: z.string().min(1)
metadata.dwellTime: z.number().min(0)
// 変更後
articleId: z.string().min(1).max(100).regex(/^[a-zA-Z0-9\-_]+$/)
metadata.dwellTime: z.number().min(0).max(86400)
```

#### favorites/schema.ts

```typescript
// articleIdフィールドがある場合、同様にmax + regex追加
```

#### recommend/schema.ts, onboarding/schema.ts

```typescript
// articleIds配列の各要素にmax + regex制約を追加
```

### 制約値の根拠

| フィールド      | 制約                      | 根拠                                                                     |
| --------------- | ------------------------- | ------------------------------------------------------------------------ |
| articleId       | max(100)                  | SCP記事IDは最長でも「SCP-XXXX-EX-JP」程度（20文字未満）。余裕を持って100 |
| articleId       | regex `^[a-zA-Z0-9\-_]+$` | SCP記事IDは英数字・ハイフンのみで構成される                              |
| q（検索クエリ） | max(200)                  | 自然言語検索として十分な長さ。200文字超は攻撃の可能性                    |
| dwellTime       | max(86400)                | 1日（24時間）を超える滞在時間は異常値                                    |

## テストケース

```typescript
describe("Zodスキーマ制約強化", () => {
  describe("articleId制約", () => {
    it("有効なarticleId（SCP-173）が受け入れられる", () => {});
    it("有効なarticleId（scp-xxxx-ex-jp）が受け入れられる", () => {});
    it("100文字のarticleIdが受け入れられる（境界値）", () => {});
    it("101文字のarticleIdが拒否される（境界値超過）", () => {});
    it("スクリプトタグを含むarticleIdが拒否される", () => {});
    it("日本語を含むarticleIdが拒否される", () => {});
    it("スペースを含むarticleIdが拒否される", () => {});
  });

  describe("検索クエリ制約", () => {
    it("200文字の検索クエリが受け入れられる（境界値）", () => {});
    it("201文字の検索クエリが拒否される（境界値超過）", () => {});
    it("2文字の検索クエリが受け入れられる（最小値）", () => {});
  });

  describe("メタデータ制約", () => {
    it("dwellTime 86400が受け入れられる（境界値）", () => {});
    it("dwellTime 86401が拒否される（境界値超過）", () => {});
  });
});
```

## 完了確認

- 確認日: （完了時に記入）
- 確認者: （完了時に記入）
- 備考: （完了時に記入）

## 参照ドキュメント

- [既存スキーマ: articles](../../../apps/api-server/src/domains/articles/schema.ts)
- [既存スキーマ: feedback](../../../apps/api-server/src/domains/feedback/schema.ts)
- [既存スキーマ: favorites](../../../apps/api-server/src/domains/favorites/schema.ts)
