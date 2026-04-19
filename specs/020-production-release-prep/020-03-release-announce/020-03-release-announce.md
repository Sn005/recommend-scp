# Story 020-03: リリース告知準備・実施

## ステータス

- **status**: in-progress
- **story-id**: 020-03
- **epic-id**: 020

## ユーザーストーリー

開発者として、SCPicks の存在をターゲットユーザー（友人・知人 + 一般 Web ユーザー）に知らせ、実際に使ってもらいたい。

## AC（受入条件）

- [x] X(Twitter) 用のリリース告知文が準備されている（`announcements.md` に 3 パターン草稿）
- [x] 友人・知人向けの共有メッセージ（URL 付き）が準備されている（`announcements.md` に 3 パターン草稿）
- [ ] X(Twitter) にリリース告知が投稿されている（開発者が実施）
- [ ] 友人・知人に直接 URL が共有されている（開発者が実施）

## 備考

- 告知文は開発者が最終確認・投稿する（AI は草稿を支援）
- OGP・Twitter カードは EPIC-018-04 で検証済み
- SCP コミュニティへの告知は本 Story のスコープ外（後回し）

## 成果物

- [announcements.md](./announcements.md): X 投稿文（3 パターン）・友人共有メッセージ（3 パターン）・投稿ログ / 共有ログ雛形

## 実装状況

- **status**: in-progress
- AC1/AC2: 完了（草稿作成）
- AC3/AC4: 開発者による投稿・共有待ち。完了後、本ファイルと `announcements.md` のログに記録し、status を `completed` に更新する。
