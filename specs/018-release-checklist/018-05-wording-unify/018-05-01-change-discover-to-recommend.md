# Subtask 018-05-01: 「発見」→「推薦」への文言変更

## ステータス

- **status**: pending
- **subtask-id**: 018-05-01
- **story-id**: 018-05
- **epic-id**: 018

## ユーザーストーリー

**開発者**として、
アプリ内の「あなた好みのSCPを発見」を「あなた好みのSCPを推薦」に統一したい。
**なぜなら**、アプリ名「SCPicks」の"Picks"（推薦）というコンセプトと文言を一致させるため。

## Acceptance Criteria（EARS記法）

- [ ] WHEN アプリのメタデータを確認する際
      GIVEN layout.tsxのOGP設定を参照した場合
      THEN og:titleが「SCPicks - あなた好みのSCPを推薦」になっている
      AND descriptionも「発見」→「推薦」に変更されている

- [ ] WHEN OGP画像を確認する際
      GIVEN opengraph-image.tsxを参照した場合
      THEN タグラインが「あなた好みのSCPを推薦」になっている

- [ ] WHEN manifest.jsonを確認する際
      GIVEN PWAマニフェストを参照した場合
      THEN descriptionが「推薦」に変更されている

- [ ] WHEN 関連するテストを実行する際
      GIVEN 文言変更後にテストを実行した場合
      THEN layout-metadata.test.ts がパスする
      AND manifest.test.ts がパスする
      AND opengraph-image.test.ts がパスする
      AND splash.test.ts がパスする

- [ ] WHEN specドキュメントを確認する際
      GIVEN 仕様書内の文言を参照した場合
      THEN 「発見」が「推薦」に統一されている

- [ ] WHEN リポジトリ全体を検索する際
      GIVEN 変更作業が完了した場合
      THEN "あなた好みのSCPを発見" という文字列がリポジトリ内に存在しない

## 変更対象ファイル（12ファイル）

### アプリコード（要変更）

| ファイル                               | 変更内容            |
| -------------------------------------- | ------------------- |
| `apps/web/src/app/layout.tsx`          | OGPタイトル・説明文 |
| `apps/web/src/app/opengraph-image.tsx` | OGP画像タグライン   |
| `apps/web/public/manifest.json`        | PWA説明文           |

### テストコード（要変更）

| ファイル                                           | 変更内容         |
| -------------------------------------------------- | ---------------- |
| `apps/web/src/app/__dev__/layout-metadata.test.ts` | 期待値の文言更新 |
| `apps/web/src/app/__dev__/manifest.test.ts`        | 期待値の文言更新 |
| `apps/web/src/app/__dev__/opengraph-image.test.ts` | 期待値の文言更新 |
| `apps/web/src/app/__dev__/splash.test.ts`          | 期待値の文言更新 |

### ドキュメント（要変更）

| ファイル                                                    | 変更内容           |
| ----------------------------------------------------------- | ------------------ |
| `specs/017-app-launch-assets/017-02-ogp-metadata/017-02.md` | spec内の文言       |
| `specs/017-app-launch-assets/017-app-launch-assets.md`      | EPIC定義の文言     |
| `specs/015-pwa/015-pwa.md`                                  | EPIC定義の文言     |
| `specs/015-pwa/015-01-pwa-base/015-01-01.md`                | Subtask specの文言 |
| `docs/pwa-launch-plan.md`                                   | ドキュメントの文言 |

## 確認手順

1. 上記12ファイルで `あなた好みのSCPを発見` を `あなた好みのSCPを推薦` に置換
2. `pnpm vitest run` で関連テストがパスすることを確認
3. `pnpm format` でフォーマット適用
4. ブラウザでOGP表示を確認
