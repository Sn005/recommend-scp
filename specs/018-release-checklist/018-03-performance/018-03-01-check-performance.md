# Subtask 018-03-01: APIレスポンス・スロークエリ確認

## ステータス

- **status**: completed
- **subtask-id**: 018-03-01
- **story-id**: 018-03
- **epic-id**: 018

## ユーザーストーリー

**開発者**として、
本番環境の主要APIエンドポイントが目標レスポンスタイム内で応答していることを確認したい。
**なぜなら**、パフォーマンス劣化はユーザー体験を直接損なうから。

## Acceptance Criteria（EARS記法）

- [x] WHEN ヘルスチェックエンドポイントにアクセスする際
      GIVEN 本番環境（scpicks.app）のAPIサーバーが稼働している場合
      THEN GET /health がHTTP 200を返す
      AND status が "ok" である

- [x] WHEN 主要APIエンドポイントのレスポンスタイムを計測する際
      GIVEN 本番環境で実際のリクエストを送信した場合
      THEN 推薦API（/recommend）のレスポンスが200ms以内である
      AND お気に入りAPI（/favorites）のレスポンスが200ms以内である

- [x] WHEN Supabaseダッシュボードを確認する際
      GIVEN pg_stat_statementsのデータを参照した場合
      THEN スロークエリアラートが発生していない
      AND 平均実行時間がベースライン（docs/operations/slow-query-optimization.md記載値）の200%以内である

## 確認手順

1. `curl -w '%{time_total}' https://scpicks.app/api/health` でヘルスチェック確認
2. ブラウザのDevToolsで主要APIの応答時間を計測
3. Supabaseダッシュボードでpg_stat_statementsを確認
4. 異常値があればEPIC-012の対応記録と照合

## 実装状況

- **status**: completed

### 実装内容

本番環境確認スクリプトを `scripts/` ディレクトリに追加:

| スクリプト                           | 対応AC | 説明                                                                         |
| ------------------------------------ | ------ | ---------------------------------------------------------------------------- |
| `scripts/check-production-health.ts` | AC1    | GET /health の HTTP 200 + status: "ok" 確認                                  |
| `scripts/check-api-performance.ts`   | AC2    | /recommend・/favorites のレスポンスタイム計測（ウォームアップ1回+中央値3回） |
| `scripts/check-slow-queries.ts`      | AC3    | pg_stat_statements でスロークエリ確認（RPC未設定時は手動確認SQL出力）        |

### 使用方法

```bash
# AC1: ヘルスチェック
npx tsx scripts/check-production-health.ts

# AC2: レスポンスタイム計測（オンボーディング完了済みvisitor_idが必要）
TEST_VISITOR_ID=<uuid> npx tsx scripts/check-api-performance.ts

# AC3: スロークエリ確認
npx tsx scripts/check-slow-queries.ts
```

## 関連ファイル

- `apps/api-server/src/routes/health.ts`
- `docs/operations/slow-query-optimization.md`
- `scripts/check-production-health.ts`
- `scripts/check-api-performance.ts`
- `scripts/check-slow-queries.ts`
