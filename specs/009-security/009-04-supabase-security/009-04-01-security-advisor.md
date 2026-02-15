---
id: "009-04-01"
epic_id: "009"
story_id: "009-04"
epic_title: "セキュリティ強化"
story_title: "Supabaseセキュリティ設定"
title: "Security Advisorアラート対応"
status: "pending"
created_at: "2026-02-15"
updated_at: "2026-02-15"
completed_at: null
---

# Subtask: Security Advisorアラート対応

## 親Story

[009-04: Supabaseセキュリティ設定](./009-04.md)

## ユーザーストーリー

**ペルソナ**: システム運用者
**目的**: Supabase Security Advisorの全アラートを確認し、対応する
**価値**: Supabaseのセキュリティベストプラクティスに完全準拠する
**理由**: 未対応のセキュリティアラートがプラットフォームレベルのリスクとなっている

> システム運用者として、Supabase Security Advisorの全アラートを確認・対応して、プラットフォームレベルのリスクを排除したい。なぜなら未対応アラートがセキュリティリスクとなっているから。

## Acceptance Criteria

### AC-1: アラート一覧の確認

- [ ] Supabase DashboardのSecurity Advisor画面で全アラートを確認している
      AND 各アラートの内容・重要度が記録されている

### AC-2: アラートへの対応

- [ ] WHEN 各アラートに対して対応方針を決定した際
      THEN 以下のいずれかの状態にする: - **Resolved**: 技術的に修正・対応完了 - **Acknowledged**: 意図的に現状維持（理由を記録）

### AC-3: 対応記録

- [ ] 各アラートに対する対応内容が以下の形式で記録されている: - アラート名 - 重要度（Critical / Warning / Info）- 対応方針（Resolved / Acknowledged）- 対応内容または Acknowledged 理由 - 対応日

## 設計

### 想定されるアラートカテゴリ

| カテゴリ     | 想定アラート          | 対応方針（予想）                         |
| ------------ | --------------------- | ---------------------------------------- |
| RLS          | テーブルにRLSが未設定 | Resolved（009-01で対応）                 |
| 認証         | MFA未設定             | Acknowledged（匿名アーキテクチャのため） |
| バックアップ | PITR未設定            | Acknowledged or Resolved（プランによる） |
| ネットワーク | IP制限未設定          | Acknowledged（開発段階のため）           |

### 対応記録テンプレート

```markdown
## Security Advisor 対応記録

### アラート 1: [アラート名]

- **重要度**: Critical / Warning / Info
- **カテゴリ**: RLS / Auth / Backup / Network / Other
- **対応方針**: Resolved / Acknowledged
- **対応内容**: [修正内容 or 現状維持の理由]
- **対応日**: YYYY-MM-DD
- **関連Subtask**: 009-01-01 等（該当する場合）
```

### 作業フロー

```
1. ユーザーからアラート内容を共有してもらう
2. 各アラートを分類（Resolved対象 / Acknowledged対象）
3. Resolved対象は技術的に対応（マイグレーション・設定変更等）
4. Acknowledged対象は理由を記録
5. 全アラートの対応状況を本specファイルに追記
```

## テストケース

```typescript
describe("Security Advisorアラート対応", () => {
  it("全アラートが確認・記録されている", () => {
    // 対応記録セクションに全アラートが記載されていること
  });

  it("各アラートがResolved または Acknowledged状態である", () => {
    // 未対応のアラートが残っていないこと
  });
});
```

## 対応記録

<!-- アラート内容の共有後、以下に対応記録を追記 -->

（後日、ユーザーからのアラート内容共有後に記録）

## 完了確認

- 確認日: （完了時に記入）
- 確認者: （完了時に記入）
- 備考: （完了時に記入）

## 参照ドキュメント

- [Supabase Security Advisor](https://supabase.com/docs/guides/platform/security-advisor)
- [009-01-01: visitorデータテーブルRLS設定](../009-01-rls/009-01-01-visitor-tables-rls.md)
- [009-01-02: マスターデータテーブルRLS設定](../009-01-rls/009-01-02-master-tables-rls.md)
