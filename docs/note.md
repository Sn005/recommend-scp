# 今後の検討メモ

## 遷移ヘッダーカード: subtitle（サブタイトル）表示

### 概要

遷移ヘッダーカードに SCP 記事のサブタイトル（例: SCP-5000 "Why?"）を表示する案。
初期リリースでは objectClass + rating のみとし、subtitle は将来検討とする。

### 現状

- DB（scp_articles）に subtitle カラムは存在しない
- publishedYear カラムも存在しない
- 追加するにはクローラー改修 + マイグレーション + API 拡張が必要

### 実現する場合の作業

1. `scp_articles` テーブルに `subtitle TEXT` カラム追加（マイグレーション）
2. クローラー（packages/pipeline）で記事ページから subtitle を抽出するロジック追加
3. 既存記事の subtitle を埋めるバッチ処理
4. `search_articles_by_embedding` RPC 関数のレスポンスに subtitle を追加
5. フロントエンドの Article 型・遷移カード表示を更新

### 備考

- SCP 記事のサブタイトルは全記事にあるわけではない（ないものも多い）
- subtitle がない場合のフォールバック表示も検討が必要
- publishedYear も同様の手順で追加可能
