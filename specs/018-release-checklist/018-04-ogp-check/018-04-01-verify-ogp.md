# Subtask 018-04-01: OGPメタデータ・Twitterカード検証

## ステータス

- **status**: completed
- **subtask-id**: 018-04-01
- **story-id**: 018-04
- **epic-id**: 018

## ユーザーストーリー

**開発者**として、
scpicks.appのOGPメタデータとTwitterカードが正しく動作していることを確認したい。
**なぜなら**、SNS告知時にリッチなプレビューが表示されないと集客効果が低下するから。

## Acceptance Criteria（EARS記法）

- [x] WHEN scpicks.appのURLをTwitter/Xに共有する際
      GIVEN OGPメタデータが設定されている場合
      THEN タイトル「SCPicks - あなた好みのSCPを推薦」が表示される
      AND OGP画像（1200x630px、青グラデーション）が正しく表示される
      AND 説明文が表示される

- [x] WHEN OGPデバッガーツールで検証する際
      GIVEN scpicks.appのURLを入力した場合
      THEN summary_large_imageカードとして正しく表示される
      AND og:title, og:description, og:image が全て設定されている

- [x] WHEN OGP画像（/opengraph-image）に直接アクセスする際
      GIVEN 本番環境で画像URLにアクセスした場合
      THEN 1200x630pxの画像が返される
      AND 「SCPicks」ブランディングとタグラインが含まれている

## 確認手順

1. OGPデバッガーツールでscpicks.appを検証
2. 実際にTwitter/Xで共有テストを実施（下書き投稿で確認）
3. `curl -I https://scpicks.app/opengraph-image` で画像レスポンス確認
4. メタデータの文言が「推薦」に統一されていることを確認

## 関連ファイル

- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/opengraph-image.tsx`
- `apps/web/src/app/twitter-image.tsx`
