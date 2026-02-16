# EPIC-006: フロントエンドUI

## 概要

Next.js App Routerを使用したフロントエンドUIを実装し、SCP記事の推薦体験を提供する。
没入型の記事閲覧体験とミニマルな操作性を重視した設計。

## ステータス

- **status**: completed

## プロダクトビジョン

> **「日常の隙間に、収容違反を」**
>
> 普段の生活に追われ昔みたいにSCPを追えなくなった人に、推薦という機能で新たな出会いと刺激をもたらす。

## ユーザーストーリー

**ペルソナ**: かつてのSCPファン（忙しい日常で離れてしまった人）
**目的**: 推薦された記事を没入感のある形で読み、気に入った記事を保存する
**価値**: 新しいSCPとの出会いを手軽に楽しめる
**理由**: 検索や選択の手間なく、自分に合った記事に出会いたい

> かつてのSCPファンとして、推薦された記事を没入感のある形で読み、新しいSCPとの出会いを手軽に楽しみたい。なぜなら検索や選択の手間なく、自分に合った記事に出会いたいから。

## 背景

### clarifyで言語化済みの設計決定

| 項目                 | 決定内容                                        |
| -------------------- | ----------------------------------------------- |
| 推薦UI               | 無限スクロール（スワイプはWebView干渉で不採用） |
| Like判定             | 読了 = 暗黙的Like、スキップ = Dislike           |
| 記事表示             | 全画面WebView埋め込み                           |
| 記事境界             | シームレス（明確な区切りなし）                  |
| ヘッダー             | 自動非表示、タイトル自動更新                    |
| スキップ操作         | ヘッダー内「次へ」ボタン                        |
| フローティングボタン | お気に入りのみ（右下）                          |
| オンボーディング     | パック選択 + SCP番号指定カスタム                |
| MVP画面              | オンボーディング、記事閲覧、お気に入り一覧      |
| 後回し               | 検索、設定、履歴、プロフィール                  |

### UIレイアウト

```
┌─────────────────────────────────────┐
│ SCP-173                    [次へ →]│ ← 自動非表示ヘッダー
├─────────────────────────────────────┤  （スクロールで隠れる）
│                                     │
│                                     │
│        [全画面 WebView]             │
│                                     │
│        シームレスに次記事へ続く     │
│        ↓                            │
│        タイトル自動更新             │
│                                     │
└───────────────────────────────[♡]──┘
                              ↑ お気に入りのみ
```

### 参照アーキテクチャ

[vidmark architecture.md](https://github.com/Sn005/vidmark/blob/main/docs/architecture.md) に準拠:

- Route Separation + Hybrid approach
- Page-exclusive components (`_components/`, `_hooks/`)
- Global shared components (`shared/`)
- Repository Patternでデータアクセス抽象化

## 主要機能

### 1. オンボーディング

- **スターターパック選択**: 事前定義されたパック（ホラー、SF等）から選択
- **SCP番号指定カスタム**: 好きなSCP番号を複数入力し、嗜好ベクトルを生成

### 2. 記事閲覧

- **全画面WebView**: 元サイトの記事をiframe/WebViewで表示
- **無限スクロール**: 記事最下部で次記事が自動読み込み
- **自動非表示ヘッダー**: スクロールで隠れ、上スクロールで再表示
- **タイトル自動更新**: Intersection Observerでスクロール位置検知
- **暗黙的Like**: 読了（最下部到達）をLikeとして記録
- **明示的スキップ**: 「次へ」ボタンでDislike記録

### 3. お気に入り管理

- **一覧表示**: 保存した記事をリスト表示
- **再読**: タップで記事をWebView表示
- **解除**: お気に入りを解除

## Acceptance Criteria（EPIC レベル）

### AC-1: オンボーディング

- [ ] WHEN ユーザーが初回起動した際
      GIVEN visitorIdが未登録の場合
      THEN オンボーディング画面が表示される
      AND スターターパック選択またはSCP番号指定を選べる

### AC-2: パック選択

- [ ] WHEN ユーザーがスターターパックを選択した際
      THEN POST /onboarding/select APIが呼び出される
      AND 記事閲覧画面に遷移する

### AC-3: SCP番号指定

- [ ] WHEN ユーザーがSCP番号を複数入力した際
      THEN 入力されたSCPから嗜好ベクトルが生成される
      AND 記事閲覧画面に遷移する

### AC-4: 記事閲覧

- [ ] WHEN 記事閲覧画面が表示された際
      THEN 全画面でWebViewが表示される
      AND ヘッダーにSCP番号が表示される

### AC-5: 自動非表示ヘッダー

- [ ] WHEN ユーザーが下方向にスクロールした際
      THEN ヘッダーが自動的に非表示になる
- [ ] WHEN ユーザーが上方向にスクロールした際
      THEN ヘッダーが再表示される

### AC-6: 無限スクロール

- [ ] WHEN ユーザーが記事最下部に到達した際
      THEN 次の推薦記事が自動的に読み込まれる
      AND ヘッダータイトルが新しい記事に更新される

### AC-7: 読了記録

- [ ] WHEN ユーザーが記事最下部に到達した際
      THEN 暗黙的Likeとしてフィードバックが記録される

### AC-8: スキップ

- [ ] WHEN ユーザーが「次へ」ボタンをタップした際
      THEN Dislikeとしてフィードバックが記録される
      AND 次の推薦記事が表示される

### AC-9: お気に入り追加

- [ ] WHEN ユーザーがお気に入りボタンをタップした際
      THEN 記事がお気に入りに追加される
      AND ボタンの状態が「追加済み」に変化する

### AC-10: お気に入り一覧

- [ ] WHEN ユーザーがお気に入り一覧画面を開いた際
      THEN 保存した記事がリスト表示される
      AND タップで記事を再読できる
      AND お気に入りを解除できる

### AC-11: 推薦切れ対応

- [ ] WHEN 推薦する記事がなくなった際
      THEN 再オンボーディングを提案する画面が表示される

### AC-12: エラー対応

- [ ] WHEN API呼び出しでエラーが発生した際
      THEN シンプルなエラーメッセージが表示される

### AC-13: visitorId管理

- [ ] WHEN アプリケーションが起動した際
      THEN localStorageからvisitorIdを取得する
      AND 存在しない場合は新規生成してPOST /visitorsを呼び出す

### AC-14: 型安全なAPI連携

- [ ] WHEN APIを呼び出す際
      THEN Hono RPCクライアントにより型安全な通信が行われる

## デザインガイドライン

フロントエンド実装時は、以下のデザインドキュメントを**必ず参照**すること：

| ドキュメント         | パス                                   | 内容                                        |
| -------------------- | -------------------------------------- | ------------------------------------------- |
| デザイントークン     | `mockups/design-tokens.css`            | CSS変数（カラー、スペーシング、シャドウ等） |
| デザインガイドライン | `mockups/DESIGN_GUIDELINES.md`         | コンポーネント仕様、インタラクション定義    |
| モックアップ確認     | https://sn005.github.io/recommend-scp/ | 実際のUI確認                                |

### 確定デザイン方針

- **カラー**: 案C クリーンラボ風（`#3B82F6` + 白ベース）
- **ナビゲーション**: フローティングピル型ボトムナビ（2ボタン: ♡ / →）
- **メニュー**: 全画面共通ドロワーメニュー（戻るボタン廃止）
- **原則**: 没入感最大化、決断を促す、一貫性

## Story 一覧

| ID                                          | 名前             | 概要                                          | ステータス |
| ------------------------------------------- | ---------------- | --------------------------------------------- | ---------- |
| [006-00](./006-00-mockups/006-00.md)        | UIモック作成     | 静的HTMLモックでUI方向性を確定                | completed  |
| [006-01](./006-01-onboarding/006-01.md)     | オンボーディング | パック選択・SCP番号指定による初期設定         | completed  |
| [006-02](./006-02-article-reader/006-02.md) | 記事閲覧         | 全画面WebView・無限スクロール・フィードバック | completed  |
| [006-03](./006-03-favorites/006-03.md)      | お気に入り管理   | お気に入り一覧・再読・解除                    | completed  |

## 技術設計

### ディレクトリ構成

```
apps/web/src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                  # ランディング or リダイレクト
│   ├── onboarding/
│   │   ├── page.tsx
│   │   ├── _components/
│   │   │   ├── PackSelector/
│   │   │   │   ├── index.tsx
│   │   │   │   └── usePackSelector.ts
│   │   │   └── ScpNumberInput/
│   │   │       ├── index.tsx
│   │   │       └── useScpNumberInput.ts
│   │   └── _hooks/
│   │       └── useOnboarding.ts
│   ├── reader/
│   │   ├── page.tsx
│   │   ├── _components/
│   │   │   ├── ArticleWebView/
│   │   │   │   ├── index.tsx
│   │   │   │   └── useArticleWebView.ts
│   │   │   ├── AutoHideHeader/
│   │   │   │   ├── index.tsx
│   │   │   │   └── useAutoHideHeader.ts
│   │   │   └── FavoriteButton/
│   │   │       ├── index.tsx
│   │   │       └── useFavoriteButton.ts
│   │   └── _hooks/
│   │       ├── useScrollPosition.ts
│   │       ├── useInfiniteArticles.ts
│   │       └── useReadingProgress.ts
│   └── favorites/
│       ├── page.tsx
│       └── _components/
│           └── FavoriteList/
│               ├── index.tsx
│               └── useFavoriteList.ts
│
└── shared/
    ├── components/
    │   └── ui/
    │       ├── Button/
    │       └── ErrorMessage/
    ├── hooks/
    │   └── useVisitorId.ts
    ├── lib/
    │   └── api-client.ts         # Hono RPCクライアント
    └── types/
        └── index.ts
```

### データフロー

```
┌─────────────────────────────────────────────────────────────┐
│ Client (Next.js)                                            │
│                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    │
│  │ Onboarding  │───▶│   Reader    │───▶│  Favorites  │    │
│  └─────────────┘    └─────────────┘    └─────────────┘    │
│         │                  │                  │             │
│         ▼                  ▼                  ▼             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Hono RPC Client                        │   │
│  │              (packages/api-types)                   │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│ API Server (Hono) - EPIC-005                                │
│                                                             │
│  POST /visitors           - visitorId登録                   │
│  GET  /onboarding/packs   - スターターパック一覧            │
│  POST /onboarding/select  - パック選択・初期化              │
│  POST /recommend          - 推薦取得                        │
│  POST /feedback           - Like/Dislike/Favorite記録       │
│  GET  /favorites          - お気に入り一覧                  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 依存関係

- **EPIC-005**: バックエンドAPI（Hono RPC）
- **packages/api-types**: 型定義

## 参照ドキュメント

- [フロントエンド設計決定書](../../docs/frontend-design-decisions.md)
- [アーキテクチャ定義](../../.ai/architecture.md)
- [vidmark architecture.md](https://github.com/Sn005/vidmark/blob/main/docs/architecture.md)
- [EPIC-005: バックエンドAPI](../005-backend-api/005-backend-api.md)
