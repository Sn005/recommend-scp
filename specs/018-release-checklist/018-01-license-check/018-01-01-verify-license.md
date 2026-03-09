# Subtask 018-01-01: 本番環境でのライセンス表示確認

## ステータス

- **status**: completed
- **subtask-id**: 018-01-01
- **story-id**: 018-01
- **epic-id**: 018

## ユーザーストーリー

**開発者**として、
本番環境（scpicks.app）でライセンス表示が正しく機能していることを確認したい。
**なぜなら**、CC BY-SA 3.0準拠の帰属表示が欠けていると法的問題になるから。

## Acceptance Criteria（EARS記法）

- [x] WHEN ライセンスページ（scpicks.app/licensing）にアクセスする際
      GIVEN 本番環境が稼働している場合
      THEN 以下が正しく表示されている - CC BY-SA 3.0ライセンスの明示 - SCP Foundationへの帰属表示 - ShareAlike条項の説明 - ライセンス全文へのリンク
      AND リンク切れがない

- [x] WHEN 記事詳細画面を表示する際
      GIVEN 記事コンテンツが表示されている場合
      THEN AttributionFooterが表示されている - 著者名（既知の場合）- CC BY-SA 3.0表記 - SCP Foundation表記 - 原文へのリンク（scp-jp.wikidot.com）

- [x] WHEN ドロワーメニューを開く際
      GIVEN メイン画面のメニューアイコンをタップした場合
      THEN ライセンスページへのナビゲーションリンクが表示されている

## 確認手順

1. scpicks.app/licensing にアクセスし、表示内容を目視確認
2. 任意の記事を開き、AttributionFooterの表示を確認
3. 各リンクをクリックし、リンク切れがないことを確認
4. ドロワーメニューからライセンスページに遷移できることを確認

## 関連ファイル

- `apps/web/src/app/(main)/licensing/page.tsx`
- `apps/web/src/shared/components/ui/AttributionFooter/index.tsx`
- `specs/014-scp-licensing/` （実装済みspec）
