# wiki-proxy カスタマイズ戦略

## 概要

wiki-proxy エンドポイント（`/api/wiki-proxy/*`）における SCP 記事カスタマイズの設計戦略を定義する。
DOM 抽出方式への移行（2026-02-16）に伴い、記事固有の JavaScript・CSS が保持されるようになったため、
セキュリティモデルと可読性スタイル戦略を明文化する。

## ステータス

- **status**: completed

## 背景

### printer--friendly モードの問題

従来は SCP Wiki の `printer--friendly` URL（印刷用ページ）を取得していた。
このモードでは記事固有の CSS テーマや装飾 JS が一切含まれないため、
SCP Wiki 独自の雰囲気（暗色テーマ、インタラクティブ演出等）が失われていた。

### DOM 抽出方式への移行

通常ページを jsdom で解析し、`#main-content`（記事本文）を抽出する方式に変更。
記事固有の CSS・JS を選択的に保持することで、原作の体験を忠実に再現する。

## 1. 記事内 JavaScript のセキュリティ戦略

### 方針

**記事固有 JS は許可し、プラットフォームスクリプトのみ除外する。**

### プラットフォームスクリプトの識別基準

以下のパターンに合致するスクリプトをプラットフォームスクリプトとして除外する。

#### 外部スクリプト（src 属性あり）

| パターン         | 対象                                      |
| ---------------- | ----------------------------------------- |
| `cloudfront.net` | Wikidot CDN（WIKIDOT.combined.js 等）     |
| `wikidot.com`    | Wikidot プラットフォーム静的リソース      |
| `wdfiles.com`    | Wikidot ファイルストレージ（JS ファイル） |

#### インラインスクリプト（src 属性なし）

| パターン           | 対象                                   |
| ------------------ | -------------------------------------- |
| `WIKIDOT.<prop> =` | WIKIDOT グローバルオブジェクトの初期化 |
| `OZONE.<prop> =`   | OZONE モジュールの初期化               |
| `YAHOO.<prop> =`   | YUI ライブラリの初期化                 |

上記に該当しない空でないインラインスクリプト、および上記ドメイン以外の外部スクリプトは
「記事固有 JS」として保持する。

### WIKIDOT スタブ注入

記事固有 JS が `WIKIDOT.page` 等を参照するケースに備え、
以下のスタブを記事 JS より前に注入し、`ReferenceError` を防止する。

```javascript
window.WIKIDOT = { page: { listeners: {} }, modules: {} };
```

### セキュリティ上の許容範囲と制約

| 項目                | 判断         | 理由                                                                                                                                                       |
| ------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 記事固有 JS の実行  | **許可**     | SCP Wiki の記事は著者がカスタム JS を埋め込むことが一般的（装飾演出、インタラクティブ要素等）。これを制限すると記事体験が著しく損なわれる                  |
| iframe sandbox 属性 | **適用済み** | フロントエンドの iframe に `sandbox="allow-scripts allow-same-origin allow-popups"` を設定。スクリプト実行は許可するが、トップレベルナビゲーション等は制限 |
| 外部通信            | **制限なし** | 記事 JS が外部 API にリクエストを送る可能性はあるが、iframe sandbox 内で実行されるため影響範囲は限定的                                                     |
| DOM 操作            | **許可**     | 記事 JS が iframe 内の DOM を操作するのは正常な動作。親ウィンドウへのアクセスは same-origin policy で制限される                                            |

### リスク評価

| リスク                             | 深刻度 | 対策                                                                                 |
| ---------------------------------- | ------ | ------------------------------------------------------------------------------------ |
| 悪意ある記事 JS によるフィッシング | 低     | SCP Wiki はモデレーション済みコンテンツ。iframe sandbox でトップナビゲーションは制限 |
| 記事 JS によるパフォーマンス劣化   | 中     | 記事ごとの問題。将来的にスクリプト実行時間の監視を検討                               |
| 記事 JS による外部リソース読み込み | 低     | 元の SCP Wiki でも同様に実行される。追加リスクなし                                   |
| WIKIDOT スタブと記事 JS の互換性   | 中     | 最小限のスタブで対応。必要に応じてスタブのプロパティを拡張                           |

### WIKIDOT.combined.js 代替機能

プラットフォームスクリプト除去により失われる以下の機能は、注入 JS でバニラ JS 再実装する。

| 機能                         | 元の実装                    | 代替実装                                                   |
| ---------------------------- | --------------------------- | ---------------------------------------------------------- |
| collapsible-block 開閉       | WIKIDOT.combined.js         | バニラ JS（`click` イベント委任）                          |
| colmod 開閉（Boyu12 氏開発） | WIKIDOT.combined.js         | バニラ JS（`folded`/`unfolded` クラス切り替え）            |
| YUI TabView タブ切り替え     | WIKIDOT.combined.js + YUI   | バニラ JS（`.yui-nav` クリック → `.yui-content` 切り替え） |
| リンクインターセプト         | N/A（通常はドメイン内遷移） | バニラ JS（プロキシ経由に変換 + 外部リンクは新タブ）       |

## 2. 可読性スタイル（CSS）維持戦略

### 方針

**記事固有テーマ CSS の装飾（色・背景・ボーダー等）は尊重し、可読性に直結するレイアウト・タイポグラフィのみ `!important` で上書きする。**

### CSS 適用順序

```
1. <link rel="stylesheet">  ← 外部 CSS（Wikidot テーマ、記事テーマ）
2. <style>                  ← 記事固有インライン CSS
3. INJECTED_STYLE           ← 注入 CSS（可読性スタイル、!important あり）
```

注入 CSS は記事固有 CSS の後に配置されるため、通常の CSS カスケードで優先される。
ただし記事テーマが特定セレクタで高 specificity のルールを持つ場合に備え、
可読性に直結するプロパティには `!important` を付与する。

### 注入 CSS の定義と根拠

#### レイアウトリセット

| セレクタ        | プロパティ  | 値                | 根拠                                                 |
| --------------- | ----------- | ----------------- | ---------------------------------------------------- |
| `#main-content` | `margin`    | `0 !important`    | Wikidot 構造要素のマージンによる記事幅の狭小化を防止 |
| `#main-content` | `padding`   | `0 !important`    | 同上                                                 |
| `#main-content` | `max-width` | `none !important` | 同上                                                 |

#### タイポグラフィ

| セレクタ        | プロパティ                 | 値                           | 根拠                                 |
| --------------- | -------------------------- | ---------------------------- | ------------------------------------ |
| `#page-title`   | `font-size`                | `24px !important`            | design-tokens `--font-size-3xl` 準拠 |
| `#page-title`   | `font-weight`              | `bold !important`            | モックアップ準拠                     |
| `body`          | `font-family`              | Hiragino, Meiryo, sans-serif | 日本語フォントスタック               |
| `body`          | `line-height`              | `1.8 !important`             | モバイル読書時の可読性確保           |
| `body`          | `-webkit-text-size-adjust` | `100%`                       | iOS Safari のテキスト自動拡大防止    |
| `#page-content` | `font-size`                | `15px !important`            | モバイル環境での最適な本文サイズ     |
| `#page-content` | `padding`                  | `0 16px !important`          | モック準拠の左右余白                 |

#### コンテンツ最適化

| セレクタ                                  | プロパティ      | 値                | 根拠                              |
| ----------------------------------------- | --------------- | ----------------- | --------------------------------- |
| `#page-content p`                         | `margin-bottom` | `1em !important`  | 段落間スペーシング                |
| `#page-content img`                       | `max-width`     | `100% !important` | 画像レスポンシブ化                |
| `#page-content img`                       | `height`        | `auto !important` | アスペクト比維持                  |
| `#page-content .block-left, .block-right` | `float`         | `none !important` | モバイルでの float ブロック無効化 |

#### コンポーネント非表示

| セレクタ                                                                                | プロパティ                 | 根拠                                                            |
| --------------------------------------------------------------------------------------- | -------------------------- | --------------------------------------------------------------- |
| `.collapsible-block:has(>.collapsible-block-unfolded>.collapsible-block-content>.code)` | `display: none !important` | テーマ CSS ソースコード表示ブロックを非表示（記事本文ではない） |

### インラインスタイル除去

記事 HTML 内の `style="..."` 属性は除去する（レイアウト崩れ防止）。
ただし `display: none` を含む属性は保持する（Wikidot コンポーネントの表示制御用）。

### `!important` を使用しないプロパティ

以下のプロパティには `!important` を使用せず、記事テーマの値を尊重する。

| プロパティ         | 理由                                     |
| ------------------ | ---------------------------------------- |
| `color`            | 記事テーマの文字色を尊重（暗色テーマ等） |
| `background-color` | 記事テーマの背景色を尊重                 |
| `border`           | 記事の装飾ボーダーを尊重                 |
| `text-decoration`  | 記事のリンク装飾等を尊重                 |

## 3. 処理パイプライン

```
[SCP Wiki 通常ページ取得]
        ↓
[jsdom DOM 解析]
        ↓
[extractContent: #main-content 抽出 + CSS/JS 収集 + スクリプトフィルタリング]
        ↓
[buildHtml: 最適化 HTML 再構築]
  - meta (charset, viewport)
  - 外部 CSS (<link>)
  - 記事固有 CSS (<style>)
  - 注入 CSS (INJECTED_STYLE)
  - 記事本文 (#main-content)
  - WIKIDOT スタブ
  - 記事固有 JS
  - 注入 JS (INJECTED_SCRIPT)
        ↓
[rewriteUrls: URL 書き換え + インラインスタイル除去]
  - インライン style 属性除去
  - HTTP/プロトコル相対 URL → プロキシパス変換
  - CloudFront URL → HTTPS 変換
  - 絶対パス href → /api/wiki-proxy/ 変換
        ↓
[HTML レスポンス配信]
```

## 実装ファイル

| ファイル                                                | 役割                          |
| ------------------------------------------------------- | ----------------------------- |
| `apps/api-server/src/routes/wiki-proxy.ts`              | wiki-proxy エンドポイント実装 |
| `apps/api-server/src/routes/__dev__/wiki-proxy.test.ts` | テスト（67 ケース）           |

## 関連ドキュメント

| ドキュメント               | パス                                                    |
| -------------------------- | ------------------------------------------------------- |
| ADR（意思決定記録）        | `docs/adr-wiki-proxy-dom-extraction.md`                 |
| フロントエンド設計決定書   | `docs/frontend-design-decisions.md`                     |
| WebView コンポーネント仕様 | `specs/006-frontend/006-02-article-reader/006-02-02.md` |
| 遷移 UX Story 仕様         | `specs/006-frontend/006-05-transition-ux/006-05.md`     |

## 変更履歴

| 日付       | 変更内容                                                     |
| ---------- | ------------------------------------------------------------ |
| 2026-02-16 | 初版作成。printer--friendly → DOM 抽出方式への移行に伴い策定 |
