---
id: "009"
title: "セキュリティ強化"
status: "planned"
created_at: "2026-02-15"
updated_at: "2026-02-15"
---

# EPIC: セキュリティ強化

## ユーザーストーリー

**ペルソナ**: システム運用者 / エンドユーザー
**目的**: APIサーバーとデータベースのセキュリティを強化し、データ漏洩・不正データ注入を防止する
**価値**: ユーザーの閲覧履歴・お気に入り等の個人データが適切に保護され、安全にサービスを利用できる
**理由**: 匿名visitorIdベースのアーキテクチャにおいて、他ユーザーのデータへの不正アクセスやSupabase Security Advisorの指摘事項を解消し、サービスの信頼性を担保したい

> システム運用者として、APIサーバーとデータベースのセキュリティを強化して、データ漏洩・不正データ注入を防止したい。なぜなら匿名visitorIdベースのアーキテクチャにおいて、ユーザーデータの保護とSupabase Security Advisorの指摘解消が必要だから。

## 背景

### clarifyで言語化済みの設計決定

| 項目                 | 決定内容                                                          |
| -------------------- | ----------------------------------------------------------------- |
| スコープ             | 未実装部分の補完 + Supabaseセキュリティアラート対応               |
| 脅威モデル           | データ漏洩防止 + 悪意あるデータ注入防止                           |
| RLS方針              | Service Role経由 + API層でvisitorId検証（DB層はシンプルに保つ）   |
| データ注入対策       | 入力バリデーション強化のみ（既存Zodスキーマの拡充）               |
| レート制限           | 今回スコープ外（トラフィック増加時に別途対応）                    |
| セキュリティヘッダー | Honoミドルウェアで実装（インフラ層は対象外）                      |
| Supabaseアラート     | 1つのStoryにまとめ、AC内で指摘事項のResolved/Acknowledged化を定義 |

### 既存実装状況

| 項目                 | 状態                 | 備考                                    |
| -------------------- | -------------------- | --------------------------------------- |
| CORS設定             | 実装済み             | `ALLOWED_ORIGINS`環境変数ベース         |
| 入力バリデーション   | 実装済み（型レベル） | 全ドメインにZodスキーマあり             |
| RLS                  | 部分実装             | `article_translations`のみ（1テーブル） |
| セキュリティヘッダー | 未実装               |                                         |
| レート制限           | パイプラインのみ     | API未対応（今回スコープ外）             |

### 設計制約

- 認証なし（匿名visitorId）のアーキテクチャは変更しない
- API経由のみのアクセスパターンを前提（フロントエンドからの直接Supabaseアクセスは想定外）
- セキュリティヘッダーはHonoミドルウェアで実装（インフラ層は対象外）

## Acceptance Criteria

### AC-1: RLS（Row Level Security）

- [ ] WHILE Supabaseテーブルがアクセスされる際
      THE SYSTEM SHALL 全ユーザーデータテーブル（visitors, feedback, favorites, view_history, recommendation_log）にRLSポリシーが有効化されている
      AND 読み取りは公開許可、書き込みはservice_roleのみ許可する

- [ ] WHEN RLSポリシーが設定された状態で
      GIVEN anonキーで直接Supabaseにアクセスを試みた場合
      THEN 書き込み操作は拒否される

### AC-2: 入力バリデーション強化

- [ ] WHEN APIエンドポイントがリクエストを受け付ける際
      GIVEN 不正な形式のvisitorId（UUID以外）が送信された場合
      THEN システムは400 Bad RequestをRFC 7807形式で返す

- [ ] WHEN 文字列フィールドに過度に長い入力が送信された際
      THEN システムは最大長バリデーションで拒否する

### AC-3: セキュリティヘッダー

- [ ] WHILE APIサーバーがレスポンスを返す際
      THE SYSTEM SHALL 標準的なセキュリティヘッダー（X-Content-Type-Options, X-Frame-Options等）を付与する

### AC-4: Supabaseセキュリティ設定

- [ ] WHEN Supabase Security Advisorを確認した際
      THEN 全指摘事項がResolved または Acknowledged 状態である

## 関連Story

- [009-01: RLS拡充・DB層セキュリティ](./009-01-rls/009-01.md)
- [009-02: API入力バリデーション強化](./009-02-validation/009-02.md)
- [009-03: セキュリティヘッダー](./009-03-security-headers/009-03.md)
- [009-04: Supabaseセキュリティ設定](./009-04-supabase-security/009-04.md)

## 依存関係

- **EPIC-005**: バックエンドAPI（セキュリティ強化の対象）
- **EPIC-007**: インフラ・デプロイ（並行可能）

## 参照ドキュメント

- [アーキテクチャ定義](../../.ai/architecture.md)
- [コーディングガイドライン](../../.ai/coding-guidelines.md)
- [EPIC-005: バックエンドAPI](../005-backend-api/005-backend-api.md)
