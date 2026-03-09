# Subtask 018-03-01: APIレスポンス・スロークエリ確認

## ステータス

- **status**: pending
- **subtask-id**: 018-03-01
- **story-id**: 018-03
- **epic-id**: 018

## ユーザーストーリー

**開発者**として、
本番環境の主要APIエンドポイントが目標レスポンスタイム内で応答していることを確認したい。
**なぜなら**、パフォーマンス劣化はユーザー体験を直接損なうから。

## Acceptance Criteria（EARS記法）

- [ ] WHEN ヘルスチェックエンドポイントにアクセスする際
      GIVEN 本番環境（scpicks.app）のAPIサーバーが稼働している場合
      THEN GET /health がHTTP 200を返す
      AND status が "ok" である

- [ ] WHEN 主要APIエンドポイントのレスポンスタイムを計測する際
      GIVEN 本番環境で実際のリクエストを送信した場合
      THEN 推薦API（/recommendations）のレスポンスが200ms以内である
      AND お気に入りAPI（/favorites）のレスポンスが200ms以内である

- [ ] WHEN Supabaseダッシュボードを確認する際
      GIVEN pg_stat_statementsのデータを参照した場合
      THEN スロークエリアラートが発生していない
      AND 平均実行時間がベースライン（docs/slow-query-optimization.md記載値）の200%以内である

## 確認手順

1. `curl -w '%{time_total}' https://scpicks.app/api/health` でヘルスチェック確認
2. ブラウザのDevToolsで主要APIの応答時間を計測
3. Supabaseダッシュボードでpg_stat_statementsを確認
4. 異常値があればEPIC-012の対応記録と照合

## 関連ファイル

- `apps/api-server/src/routes/health.ts`
- `docs/slow-query-optimization.md`
