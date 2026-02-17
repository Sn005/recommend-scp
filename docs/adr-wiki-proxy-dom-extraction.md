# ADR: wiki-proxy を printer--friendly から DOM 抽出方式へ移行

- **日付**: 2026-02-16
- **ステータス**: 採用
- **関連スペック**: `specs/005-backend-api/wiki-proxy-customization-strategy.md`

## コンテキスト

wiki-proxy（`/api/wiki-proxy/*`）は SCP Wiki のコンテンツを HTTPS 経由で同一オリジン配信するリバースプロキシである。
iframe 内で記事を表示し、contentWindow 直接アクセスによるスクロール検知を実現するために不可欠な基盤。

従来は SCP Wiki の `printer--friendly` URL（印刷用ページ）を取得していた。
この方式には以下の問題があった。

### printer--friendly モードで失われていたもの

| 要素                | 具体例                                         | 影響                                   |
| ------------------- | ---------------------------------------------- | -------------------------------------- |
| 記事テーマ CSS      | Black Highlighter テーマ、SCP-JP 独自テーマ    | 暗色背景の記事が白背景で表示される     |
| 装飾 CSS            | コンテインメントクラス表示枠、カスタムヘッダー | 記事の視覚的アイデンティティが失われる |
| インタラクティブ JS | collapsible-block、tabview、カスタム演出       | 折りたたみ・タブが静的表示になる       |
| 画像配置 CSS        | float ブロック、画像キャプション装飾           | レイアウトが崩れる                     |

SCP Wiki の記事は「テーマと演出込みで作品」であり、これらが欠落すると原作体験が著しく損なわれる。
プロダクトビジョン「日常の隙間に、収容違反を」の実現には、SCP Wiki の雰囲気の忠実な再現が必要。

## 検討した選択肢

### 選択肢 A: printer--friendly + CSS/JS 個別取得（不採用）

printer--friendly ページを取得した上で、通常ページから CSS/JS を別途取得して結合する。

- **メリット**: printer--friendly の簡素な HTML 構造を活かせる
- **デメリット**: 2 回の HTTP リクエストが必要。通常ページのパース処理が結局必要になり、printer--friendly を使う意味が薄れる
- **不採用理由**: 複雑さが増す割にメリットが少ない

### 選択肢 B: 通常ページの正規表現加工（不採用）

通常ページを正規表現でサイドバー・ヘッダー等を除去する。

- **メリット**: jsdom 依存が不要
- **デメリット**: Wikidot の HTML 構造変更に脆弱。複雑な正規表現がメンテナンスコストを増大させる。ネストしたタグの正確な除去が困難
- **不採用理由**: HTML の構造的操作に正規表現は不適切

### 選択肢 C: 通常ページの DOM 抽出（採用）

通常ページを jsdom でパースし、`#main-content` を抽出して再構築する。

- **メリット**: DOM API による確実な要素抽出。CSS/JS の選択的保持が容易。jsdom は既にプロジェクトの依存関係に存在（api-server の articles/service.ts で使用中）
- **デメリット**: jsdom のパース処理にメモリ・CPU コストがある
- **採用理由**: 正確性・保守性・拡張性のバランスが最も優れている

## 決定

### 決定 1: DOM 抽出方式の採用

通常ページを jsdom でパースし、`#main-content`（`#page-title` + `#page-content`）を抽出する方式を採用。

**根拠**: DOM API による構造的操作は正規表現より正確で保守性が高い。jsdom は既存依存であり追加コストはない。

### 決定 2: 記事固有 JavaScript の実行を許可する

プラットフォームスクリプト（WIKIDOT.combined.js 等）のみを除外し、記事著者が埋め込んだカスタム JS は保持・実行を許可する。

**根拠**:

- SCP Wiki の記事は著者がカスタム JS を埋め込むことが一般的であり、これが記事体験の重要な要素
- フロントエンドの iframe には `sandbox="allow-scripts allow-same-origin allow-popups"` が設定されており、トップレベルナビゲーション等は制限される
- SCP Wiki はコミュニティによるモデレーションが機能しており、悪意あるスクリプトが残存するリスクは低い
- 元の SCP Wiki サイトで閲覧する場合と同等のリスクであり、追加のセキュリティリスクは限定的

**許容したリスク**:

- 記事 JS によるパフォーマンス劣化の可能性（記事個別の問題として受容）
- WIKIDOT スタブの互換性問題（最小限のスタブで開始し、問題発生時に拡張する方針）

### 決定 3: 可読性 CSS は `!important` で記事テーマと共存させる

記事固有テーマ CSS の装飾（色・背景・ボーダー等）は尊重し、可読性に直結するレイアウト・タイポグラフィ（font-size, line-height, padding, max-width 等）のみ `!important` で上書きする。

**根拠**:

- 記事テーマの色・背景は作品の雰囲気に直結するため上書きすべきでない
- 一方で font-size, line-height, padding 等の可読性プロパティはモバイル環境での読書体験を左右するため、確実に適用する必要がある
- CSS カスケードの順序だけでは、記事テーマの高 specificity ルールに負ける可能性がある
- `!important` の適用範囲を「可読性プロパティのみ」に限定することで、過剰な上書きを防止する

**上書き対象の選定基準**:

| 上書きする                               | 上書きしない                    |
| ---------------------------------------- | ------------------------------- |
| レイアウト（margin, padding, max-width） | 色（color, background-color）   |
| タイポグラフィ（font-size, line-height） | 装飾（border, text-decoration） |
| 画像サイズ（max-width, height）          | テーマ固有の視覚要素            |

### 決定 4: WIKIDOT.combined.js の代替機能をバニラ JS で再実装

プラットフォームスクリプト除去で失われる collapsible-block 開閉、colmod 開閉、YUI TabView タブ切り替えをバニラ JS で再実装する。

**根拠**:

- WIKIDOT.combined.js は 200KB 超の巨大スクリプトであり、不要な機能が大量に含まれる
- 必要な機能は collapsible-block 開閉、colmod 開閉、TabView の 3 つのみ
- バニラ JS による再実装は各 10-20 行程度で十分シンプル
- イベント委任パターンにより、動的に生成される要素にも対応可能

## 結果

### 正の影響

- SCP Wiki の記事テーマ・装飾が忠実に再現され、原作体験が向上
- DOM 抽出による正確な要素操作で、HTML 構造変更への耐性が向上
- 処理パイプラインが明確（extractContent → buildHtml → rewriteUrls）で保守性が向上

### 負の影響・トレードオフ

- jsdom パース処理のオーバーヘッド（ただし printer--friendly モードでもレスポンス処理は必要だったため、増分は限定的）
- 記事固有 JS の実行を許可するため、理論上は予期しない動作の可能性がある
- `!important` の使用は CSS の一般的なベストプラクティスに反するが、サードパーティ CSS との共存という制約上やむを得ない

### 補足: jsdom から linkedom への移行（2026-02-17）

Vercel の Node.js ランタイムで jsdom の依存 `html-encoding-sniffer` → `@exodus/bytes` が ESM/CJS 互換性エラー（`ERR_REQUIRE_ESM`）を起こし、wiki-proxy が 502 を返す問題が発生した。

動的 import（`await import("jsdom")`）でも jsdom 内部の `require()` チェーンが CJS コンテキストで ESM モジュールを読み込もうとするため解決できなかった。

**対応**: jsdom を [linkedom](https://github.com/WebReflection/linkedom) に置き換え。

- **ESM ネイティブ**: CJS/ESM 互換性問題が発生しない
- **軽量**: jsdom の約 1/10 のサイズ。Vercel serverless function のコールドスタートが改善
- **DOM API 互換**: `querySelector`, `querySelectorAll`, `outerHTML`, `innerHTML`, `textContent` 等、`extractContent()` が使用する API を全てサポート
- **同期 API**: `parseHTML()` は同期関数であり、`extractContent()` / `processHtml()` を非同期から同期に簡素化
- **テスト全件パス**: 既存 67 テストケースが変更なしで全てパス

`articles/service.ts` の `getContent()` でも同様に linkedom に統一した。

### 将来の検討事項

| 項目                                 | トリガー                   | 対応案                                                           |
| ------------------------------------ | -------------------------- | ---------------------------------------------------------------- |
| WIKIDOT スタブの拡張                 | 特定記事で JS エラーが発生 | エラーが出たプロパティをスタブに追加                             |
| スクリプト実行時間の監視             | パフォーマンス劣化の報告   | iframe 内のスクリプト実行時間を計測し、閾値超過時に警告          |
| CSP（Content Security Policy）の導入 | セキュリティ強化が必要に   | iframe に CSP ヘッダーを設定し、外部リソース読み込みを制限       |
| 他支部対応（EN, KO 等）              | 多言語対応時               | DOM 構造が同一（Wikidot 共通）のため、ドメイン追加のみで対応可能 |
