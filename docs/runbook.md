# 運用Runbook

障害発生時のトラブルシューティング手順をまとめたチェックリストです。
上から順に確認・実行してください。

## APIがダウンしたとき

- [ ] Vercelダッシュボードでデプロイ状態を確認
- [ ] `curl {API_BASE_URL}/health` でヘルスチェックを手動実行
- [ ] Vercelのデプロイログでエラーを確認
- [ ] 直近のデプロイでリグレッションがないか確認
- [ ] 必要に応じてVercelで前バージョンに戻す

## パイプラインが失敗したとき

- [ ] GitHub Actions実行ログを確認
- [ ] パイプラインモード（full/diff/embedding/tagging）を確認
- [ ] 外部API（OpenAI）のステータスを確認
- [ ] コスト超過で中断された場合はcost_limitを見直す
- [ ] workflow_dispatchで手動再実行

## DBが応答しないとき

- [ ] Supabaseダッシュボードでプロジェクト状態を確認
- [ ] 接続情報（SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY）が正しいか確認
- [ ] Supabaseの無料プラン制限（休止状態等）に該当しないか確認
- [ ] `curl {API_BASE_URL}/health` で degraded が返るか確認
