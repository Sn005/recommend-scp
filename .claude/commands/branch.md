# /branch - ブランチ作成コマンド

SDDワークフロー用のブランチを作成します。

## 使用方法

```
/branch <type> <action-id> [description]
```

- `type`: `spec`（仕様策定用）または `impl`（実装用）
- `action-id`: アクションID（例: 001-01-01）
- `description`: 短い説明（オプション）

## 実行内容

1. 現在のブランチと未コミット変更を確認
2. ブランチ名を生成: `{type}/{action-id}-{description}`
3. ユーザー確認後、ブランチを作成
4. 作成完了を通知

## ブランチ命名規則

| タイプ | フォーマット | 例 |
|--------|-------------|-----|
| spec | `spec/{action-id}-{desc}` | `spec/001-01-01-user-auth` |
| impl | `impl/{action-id}-{desc}` | `impl/001-01-01-user-auth` |

## 例

```
/branch spec 001-01-01 user-auth
→ ブランチ 'spec/001-01-01-user-auth' を作成

/branch impl 001-01-01 user-auth
→ ブランチ 'impl/001-01-01-user-auth' を作成
```

## エラー処理

- 未コミット変更がある場合: スタッシュまたはコミットを提案
- ブランチが既存の場合: 切り替えまたは別名を提案
