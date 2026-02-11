# Subtask 一覧: Story 005-10 favorites API

| ID                          | 名前                         | 概要                             | ステータス |
| --------------------------- | ---------------------------- | -------------------------------- | ---------- |
| [005-10-01](./005-10-01.md) | favorites repository/service | DB操作層・ビジネスロジック層     | completed  |
| [005-10-02](./005-10-02.md) | GET/DELETE /favorites        | エンドポイント実装・ルーティング | completed  |
| [005-10-03](./005-10-03.md) | POST /favorites/:articleId   | お気に入り追加エンドポイント     | pending    |

## 依存関係グラフ

```
005-10-01 (repository/service)
    ↓
005-10-02 (GET/DELETE routes)
    ↓
005-10-03 (POST route)
```
