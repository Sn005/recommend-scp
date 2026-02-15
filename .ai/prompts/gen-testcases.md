# E2Eテストケース生成プロンプト

> 型定義参照元: `apps/web/e2e/lib/types.ts`

## 入力

以下の仕様書からE2Eテストケースを生成してください。

### 仕様書

{spec_content}

## 出力形式

CSV形式で出力してください。ヘッダー行を含め、以下のスキーマに従ってください。

### スキーマ

| 列名     | 型     | 説明                                                        |
| -------- | ------ | ----------------------------------------------------------- |
| id       | string | TC-{epic}-{story}-{連番} 形式（例: TC-006-01-001）          |
| name     | string | テスト名（日本語、シナリオを表す）                          |
| steps    | JSON   | StepAction型のJSON配列（CSV内はダブルクォートでエスケープ） |
| expected | string | 期待結果（日本語）                                          |
| tags     | string | critical（正常系）または edge（エッジケース）               |
| result   | string | 空欄（実行時に記録）                                        |

## StepAction型

steps列で使用可能なアクション一覧。各ステップは以下のいずれかの型に準拠すること。

| アクション    | 形式                                                                   | 説明                   |
| ------------- | ---------------------------------------------------------------------- | ---------------------- |
| goto          | `{"action": "goto", "url": "/path"}`                                   | 指定URLに遷移          |
| click         | `{"action": "click", "testId": "element-id"}`                          | 要素をクリック         |
| fill          | `{"action": "fill", "testId": "element-id", "value": "text"}`          | 要素にテキスト入力     |
| waitFor       | `{"action": "waitFor", "testId": "element-id"}`                        | 要素の出現を待機       |
| assertVisible | `{"action": "assertVisible", "testId": "element-id"}`                  | 要素が表示されている   |
| assertText    | `{"action": "assertText", "testId": "element-id", "text": "expected"}` | テキスト一致を検証     |
| assertUrl     | `{"action": "assertUrl", "pattern": "/path"}`                          | URL パターン一致を検証 |

### testId命名規則

- **kebab-case** で命名すること（例: `genre-select-button`, `article-card-title`）
- 既存コンポーネントの data-testid を参照し、実在する testId を優先して使用すること
- 命名パターン: `{component}-{element}-{variant?}`

## 生成ルール

1. **正常系フローを優先**して生成する
2. **各ACに対して少なくとも1つ**のテストケースを生成する
3. **シナリオベース**（ユーザーフロー単位）で構成する
4. data-testid は kebab-case で命名する
5. 1テストケースあたりのステップ数は10以下を目安とする
6. tags は正常系なら `critical`、エッジケースなら `edge` を付与する
7. 仕様書にACが記載されていない場合は、概要とユーザーストーリーからテストケースを推定する

### EARS記法の解釈

仕様書のACがEARS記法で記述されている場合、以下のように解釈してテストケースに変換する:

- **WHEN**: テスト実行のトリガー（ユーザー操作）
- **GIVEN**: テスト実行の前提条件（事前状態のセットアップ）
- **THEN**: 期待結果（アサーション）
- **AND**: 追加の期待結果（別のアサーション、または別テストケース）

## 入出力例

### 入力（仕様書抜粋）

```markdown
# Story 006-01: オンボーディング

## ユーザーストーリー

ペルソナ: 新規ユーザー
目的: 好みのジャンルを選択して推薦を受ける
価値: パーソナライズされた推薦体験を得られる

## 受け入れ条件

- [ ] WHEN ユーザーがオンボーディングを完了する際
      GIVEN ジャンルを選択した場合
      THEN 推薦画面に遷移する

- [ ] WHEN ユーザーがジャンルを選択する際
      GIVEN 複数のジャンルパックが表示されている場合
      THEN 任意のパックをタップして選択・解除できる

- [ ] WHEN ユーザーがフォーム入力する際
      GIVEN 検索フィールドが表示されている場合
      THEN テキストを入力してフィルタリングできる
```

### 出力（CSV）

```csv
id,name,steps,expected,tags,result
TC-006-01-001,オンボーディング完了で推薦画面に遷移,"[{""action"":""goto"",""url"":""/onboarding""},{""action"":""waitFor"",""testId"":""pack-selector""},{""action"":""click"",""testId"":""pack-horror""},{""action"":""click"",""testId"":""complete-button""},{""action"":""assertUrl"",""pattern"":""/recommend""}]",推薦画面に遷移する,critical,
TC-006-01-002,ジャンルパックの選択と解除,"[{""action"":""goto"",""url"":""/onboarding""},{""action"":""waitFor"",""testId"":""pack-selector""},{""action"":""click"",""testId"":""pack-horror""},{""action"":""assertVisible"",""testId"":""pack-horror-selected""},{""action"":""click"",""testId"":""pack-horror""},{""action"":""assertVisible"",""testId"":""pack-horror""}]",パックの選択と解除が切り替わる,critical,
TC-006-01-003,検索フィールドでフィルタリング,"[{""action"":""goto"",""url"":""/onboarding""},{""action"":""waitFor"",""testId"":""search-field""},{""action"":""fill"",""testId"":""search-field"",""value"":""ホラー""},{""action"":""assertVisible"",""testId"":""pack-horror""},{""action"":""assertText"",""testId"":""pack-horror-title"",""text"":""ホラー""}]",入力テキストでフィルタリングされる,critical,
```

## 出力

以下のCSV形式で出力してください。ヘッダー行を必ず含めてください。

```csv
id,name,steps,expected,tags,result
...
```
