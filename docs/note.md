# 今後の検討メモ

## 遷移ヘッダーカード: subtitle（サブタイトル）表示

### 概要

遷移ヘッダーカードに SCP 記事のサブタイトル（例: SCP-5000 "Why?"）を表示する案。
初期リリースでは objectClass + rating のみとし、subtitle は将来検討とする。

### 現状

- DB（scp_articles）に subtitle カラムは存在しない
- publishedYear カラムも存在しない
- 追加するにはクローラー改修 + マイグレーション + API 拡張が必要

### 実現する場合の作業

1. `scp_articles` テーブルに `subtitle TEXT` カラム追加（マイグレーション）
2. クローラー（packages/pipeline）で記事ページから subtitle を抽出するロジック追加
3. 既存記事の subtitle を埋めるバッチ処理
4. `search_articles_by_embedding` RPC 関数のレスポンスに subtitle を追加
5. フロントエンドの Article 型・遷移カード表示を更新

### 備考

- SCP 記事のサブタイトルは全記事にあるわけではない（ないものも多い）
- subtitle がない場合のフォールバック表示も検討が必要
- publishedYear も同様の手順で追加可能

## Playwright MCP / Test Agents の将来検討

### 概要

EPIC-011（QAテスト基盤）の 011-01 実装時に Playwright × Claude Code のベストプラクティスを調査した結果、以下の技術が将来有用と判断された。現段階では採用せず、後続 Story で検討する。

### 検討対象

#### 1. Playwright MCP Server (`@playwright/mcp`)

- Microsoft公式パッケージ。ブラウザのアクセシビリティツリーを使い、AI がページを操作・検査可能
- セットアップ: `claude mcp add playwright npx '@playwright/mcp@latest'`
- アクセシビリティツリーベースで軽量（2-5KB/スナップショット vs スクリーンショット）
- 利用可能ツール: `browser_navigate`, `browser_click`, `browser_type`, `browser_snapshot` 等

**適用候補**: 011-03（AIテストケース生成）、bug-report/bug-fix Skill の探索的UI検証

#### 2. Playwright Test Agents (v1.56+)

- `npx playwright init-agents --loop=claude` で3つのエージェント Markdown を生成
  - **Planner**: ブラウザを探索してテスト計画 Markdown を生成
  - **Generator**: 計画から `.spec.ts` を自動生成
  - **Healer**: テスト失敗時に locator/assertion を自己修復して再実行
- `.claude/agents/` にエージェント定義が生成される

**適用候補**: 011-03（AIテストケース生成）のテスト自動生成、011-04（画面別テストケース）の自己修復

#### 3. 直接CLI実行 vs MCP のトレードオフ

| 観点             | 直接CLI (`npx playwright test`) | MCP (`@playwright/mcp`)                         |
| ---------------- | ------------------------------- | ----------------------------------------------- |
| トークン効率     | 高い（70-80%削減）              | 低い（アクセシビリティツリーのオーバーヘッド）  |
| 適用場面         | テストスイート実行、CI/CD       | 探索的テスト、自己修復テスト                    |
| シェルアクセス   | 必要（Claude Code は利用可能）  | 不要（MCP プロトコル経由）                      |
| コンテキスト消費 | 少ない                          | 多い（5-10 MCP サーバーで15-20%のコンテキスト） |

**011-01 での判断**: 直接CLI実行を採用。基盤構築フェーズではトークン効率を優先。

### 導入タイミング

| Story                         | 検討技術                        | 理由                             |
| ----------------------------- | ------------------------------- | -------------------------------- |
| 011-03: AIテストケース生成    | Test Agents (Planner/Generator) | spec からのテスト自動生成に有用  |
| 011-04: 画面別テストケース    | Test Agents (Healer)            | テスト自己修復で保守コスト削減   |
| bug-report/bug-fix Skill 強化 | Playwright MCP                  | モック vs 実装のUI差分検出に有用 |

### 参考リソース

- [microsoft/playwright-mcp](https://github.com/microsoft/playwright-mcp) - 公式MCP Server
- [Playwright Docs: Test Agents](https://playwright.dev/docs/test-agents) - エージェント公式ドキュメント
- [Simon Willison: Using Playwright MCP with Claude Code](https://til.simonwillison.net/claude-code/playwright-mcp-claude-code) - セットアップガイド
