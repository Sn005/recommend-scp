# EPIC-020: 本番リリース準備

## ステータス

- **status**: pending
- **created**: 2026-04-04
- **epic-id**: 020

## ユーザーストーリー

**ペルソナ**: 開発者（プロジェクトオーナー）
**目的**: SCPicks を正式に一般公開し、ユーザーに届く状態にする
**価値**: 友人・知人・一般Webユーザーがアプリを発見・利用できるようになる
**理由**: 技術的に完成していても、告知・計測手段がなければユーザーには届かないから

## 背景

/clarify セッション（2026-04-04）で「本番リリース完了」の定義を明確化した。

### 本番リリース完了の定義（必須条件）

1. 技術的残件（EPIC-012, 018-03）の完了
2. Vercel Analytics 導入によるアクセス計測基盤
3. X(Twitter) + 友人直接共有によるリリース告知
4. PV でアクセス確認

### 後回し（リリース後に検討）

- Google Play Store 登録（TWA）
- SEO 対策
- SCP コミュニティへの告知（品質に自信がついたら）
- Apple App Store

## スコープ

### 含まれるもの

- 技術的残件の完了（EPIC-012-02, EPIC-018-03 の完了確認）
- Vercel Analytics の導入・設定
- リリース告知文の準備（X 投稿 + 友人共有用メッセージ）
- リリース告知の実施
- PV によるアクセス確認

### 含まれないもの

- Google Play Store 登録（後回し）
- SEO 対策（後回し）
- SCP コミュニティ告知（後回し）
- Apple App Store 登録（スコープ外）
- 新機能の追加実装

## 関連 Story

- [020-01: 技術的残件の完了確認](020-01-tech-completion/020-01-tech-completion.md)
- [020-02: Vercel Analytics 導入](020-02-vercel-analytics/020-02-vercel-analytics.md)
- [020-03: リリース告知準備・実施](020-03-release-announce/020-03-release-announce.md)
- [020-04: アクセス確認](020-04-access-verification/020-04-access-verification.md)

## 依存関係

- EPIC-012（スロークエリ最適化）の 012-02 が完了していること
- EPIC-018-03（本番パフォーマンス確認）が完了していること

## /clarify からの引き継ぎ

### Decision Provenance サマリー

- ユーザー発案: 5 件（Store 後回し、PV 確認、Vercel Analytics、iOS スコープ外、技術残件完了）
- DA 検証済み: 2 件（Store 後回し、SEO 後回し）
- 対話的到達: 1 件（コミュニティ告知後回し）
- AI 提案採用: 0 件

### Assumption Register サマリー

- 未検証前提: 3 件（Vercel Analytics 導入状況、X アカウント、pg_stat_statements データ）
- 要注意前提: 1 件（コミュニティ告知の判断基準未定義）
