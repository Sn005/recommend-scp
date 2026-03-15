# ドキュメント一覧

## プロダクト

| ドキュメント                                     | 概要                                 |
| ------------------------------------------------ | ------------------------------------ |
| [product-concept.md](product/product-concept.md) | プロダクト構想書・コア機能・技術方針 |
| [pwa-launch-plan.md](product/pwa-launch-plan.md) | PWA リリース計画・ブランディング     |

## アーキテクチャ

| ドキュメント                                              | 概要                                   |
| --------------------------------------------------------- | -------------------------------------- |
| [package-structure.md](architecture/package-structure.md) | モノレポ構成・パッケージ責務・依存関係 |

## 設計決定（ADR）

| ドキュメント                                                                   | 日付       | 概要                                 |
| ------------------------------------------------------------------------------ | ---------- | ------------------------------------ |
| [frontend-design-decisions.md](decisions/frontend-design-decisions.md)         | 2026-01-29 | フロントエンド UI のトレードオフ分析 |
| [adr-wiki-proxy-dom-extraction.md](decisions/adr-wiki-proxy-dom-extraction.md) | 2026-02-16 | wiki-proxy の DOM 抽出方式への移行   |

## 運用

| ドキュメント                                                        | 概要                       |
| ------------------------------------------------------------------- | -------------------------- |
| [runbook.md](operations/runbook.md)                                 | 障害対応チェックリスト     |
| [vercel-setup.md](operations/vercel-setup.md)                       | Vercel デプロイ手順        |
| [setup-upstash-redis.md](operations/setup-upstash-redis.md)         | Upstash Redis 環境変数設定 |
| [slow-query-optimization.md](operations/slow-query-optimization.md) | スロークエリ分析・改善方針 |

## 開発プロセス

| ドキュメント                                                     | 概要                      |
| ---------------------------------------------------------------- | ------------------------- |
| [ui-exploration-workflow.md](process/ui-exploration-workflow.md) | UI 探索フェーズ運用ガイド |

## AI ガイダンス（参考）

AI 向けドキュメントは `.ai/` と `.claude/` に配置されています。

| ドキュメント                                            | 概要                         |
| ------------------------------------------------------- | ---------------------------- |
| [.ai/architecture.md](../.ai/architecture.md)           | アーキテクチャ定義           |
| [.ai/coding-guidelines.md](../.ai/coding-guidelines.md) | コーディングガイドライン     |
| [apps/web/ARCHITECTURE.md](../apps/web/ARCHITECTURE.md) | フロントエンドアーキテクチャ |

## アーカイブ

`_archived/` に移動済みの過去ドキュメント:

- `poc-report.md` — PoC 検証レポート（2026-01-04）
- `note.md` — 今後の検討メモ
- `analysis/` — clarify セッション分析（スキルに統合済み）
