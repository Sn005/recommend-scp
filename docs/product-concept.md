# SCP Recommend - プロダクト構想書

## 概要

SCPコンテンツをスワイプ形式でレコメンドするアプリケーション。
マッチングアプリのUIを採用し、ユーザーの好みを学習して最適なSCPを提案する。

## ライセンス方針

- **オープンソース前提で開発**
- SCP Foundation のCC BY-SA 3.0/4.0 ライセンスを継承
- プロダクト全体がCC BY-SA下で公開される

## コア機能

### 1. スワイプ形式レコメンド
- SCP記事カードを表示
- 右スワイプ: マッチ（好み）
- 左スワイプ: アンマッチ（好みでない）
- スワイプ後、次の記事に切り替わる

### 2. レコメンドエンジン
- **ハイブリッド推薦方式**を採用
  1. Embedding（意味的類似度）: 記事全体のベクトル化
  2. 明示的タグ: オブジェクトクラス、テーマ、GoI関連等
  3. 協調フィルタリング: ユーザー行動（スワイプ履歴）

### 3. 探索と活用のバランス（Exploration vs Exploitation）
- 80%: ユーザーの好みに類似した記事
- 20%: セレンディピティ枠（異なるジャンル、新着等）
- 連続5記事類似 → 次は必ず「冒険枠」を挟む

### 4. 初期オンボーディング
- 会員登録時に好みのSCPを複数選択
- 選択結果から初期プロファイルを構築

## 対象SCP支部

### MVP（フェーズ1）
- 本部 (EN): SCP Data API使用
- 日本 (JP): スクレイピング

### 将来（フェーズ2以降）
- 韓国 (KO)
- フランス (FR)
- 中国 (CN)

## データ取得

| 支部 | 方法 | ソース |
|------|------|--------|
| EN | API | https://scp-data.tedivm.com/ |
| JP | スクレイピング | https://scp-jp.wikidot.com/ |

## SCP記事の分析軸

### 自動抽出（Embedding）
- 記事全文のベクトル化
- 意味的類似度の算出

### 明示的タグ（LLM + 人手補正）
| 軸 | 例 |
|----|-----|
| オブジェクトクラス | Safe / Euclid / Keter / Thaumiel / Neutralized |
| 脅威レベル | 危険度（収容失敗時の被害規模） |
| ジャンル/雰囲気 | ホラー / SF / ファンタジー / コメディ / 悲劇 |
| テーマ | 認知災害 / 現実改変 / 異次元 / 生物 / 機械 |
| 形式 | 探査ログ主体 / インタビュー主体 / 実験ログ主体 |
| 長さ | 短編 / 中編 / 長編 |
| 評価（Vote） | 高評価 / 新着 |
| 関連GoI | 要注意団体との関連（MC&D、蛇の手 etc.） |

## 技術スタック

| 項目 | 選定 | 理由 |
|------|------|------|
| 言語 | TypeScript | vidmark準拠、型安全性 |
| モノレポ | Turborepo + pnpm | vidmark準拠 |
| Webアプリ | Next.js App Router | vidmark準拠 |
| APIサーバー | Hono | vidmark準拠、高パフォーマンス |
| DB / Auth | Supabase | vidmark準拠、PostgreSQL + RLS |
| ベクトルDB | Supabase pgvector | 統合管理、コスト効率 |
| ホスティング | Vercel + Railway | vidmark準拠 |
| テスト | Vitest | vidmark準拠 |

## ディレクトリ構成（想定）

```
recommend-scp/
├── apps/
│   ├── web/                     # Next.js Webアプリ
│   └── api-server/              # Hono APIサーバー
├── packages/
│   ├── types/                   # 型定義共有
│   ├── scp-crawler/             # SCPデータ取得
│   ├── recommendation-engine/   # 推薦エンジン
│   └── eslint-config/           # 共通設定
├── supabase/
│   └── migrations/
├── docs/
│   ├── product-concept.md       # このファイル
│   ├── architecture.md
│   └── development-guide.md
└── turbo.json
```

## 将来展望

- 他のホラーコンテンツへの展開
- ネイティブアプリ化（ガワネイティブ）
- SNS連携（好みのSCP共有）

## 参考リンク

- [SCP Foundation](https://scp-wiki.wikidot.com/)
- [SCP日本支部](https://scp-jp.wikidot.com/)
- [SCP Data API](https://scp-data.tedivm.com/)
- [SCP財団 ライセンスガイド](http://scp-jp.wikidot.com/licensing-guide)
