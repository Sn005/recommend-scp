# Subtask 011-03-01: 生成プロンプト設計

## 概要

EPIC/Story仕様書からE2Eテストケースを生成するためのプロンプトを設計する。

## ユーザーストーリー

**ペルソナ**: 開発者
**目的**: 仕様書を入力としてテストケースを生成するプロンプトを設計する
**価値**: 一貫した品質のテストケースが自動生成される
**理由**: プロンプトの品質がテストケースの品質を決定する

## 受け入れ条件（EARS記法）

- [ ] WHEN プロンプトを実行する際
      GIVEN EPIC/Story仕様書のMarkdownを入力した場合
      THEN CSV形式のテストケースが出力される

- [ ] WHEN テストケースを生成する際
      GIVEN AC（EARS記法）が含まれている場合
      THEN 各ACに対応するテストケースが生成される

- [ ] WHEN テストケースを生成する際
      GIVEN シナリオベースで出力する場合
      THEN ユーザーフロー全体を網羅するステップが含まれる

- [ ] WHEN stepsを生成する際
      GIVEN StepAction型に準拠する場合
      THEN 有効なJSON配列が出力される

## 設計

### プロンプトテンプレート

````markdown
# E2Eテストケース生成

## 入力

以下の仕様書からE2Eテストケースを生成してください。

### 仕様書

{spec_content}

## 出力形式

CSV形式で出力してください。

### スキーマ

- id: TC-{epic}-{story}-{連番} 形式
- name: テスト名（日本語、シナリオを表す）
- steps: JSON配列（StepAction型）
- expected: 期待結果（日本語）
- tags: critical（正常系）または edge（エッジケース）

### StepAction型

- goto: {"action":"goto","url":"/path"}
- click: {"action":"click","testId":"element-id"}
- fill: {"action":"fill","testId":"element-id","value":"text"}
- waitFor: {"action":"waitFor","testId":"element-id"}
- assertVisible: {"action":"assertVisible","testId":"element-id"}
- assertText: {"action":"assertText","testId":"element-id","text":"expected"}
- assertUrl: {"action":"assertUrl","pattern":"/path"}

## 生成ルール

1. 正常系フローを優先して生成
2. 各ACに対して少なくとも1つのテストケースを生成
3. data-testidは kebab-case で命名
4. シナリオベース（ユーザーフロー単位）で構成

## 出力

```csv
id,name,steps,expected,tags,result
...
```
````

````

### 入出力例

**入力（仕様書抜粋）:**
```markdown
## 受け入れ条件
- [ ] WHEN ユーザーがオンボーディングを完了する際
      GIVEN ジャンルを選択した場合
      THEN 推薦画面に遷移する
````

**出力（CSV）:**

```csv
id,name,steps,expected,tags,result
TC-006-01-001,オンボーディング完了で推薦画面に遷移,"[{""action"":""goto"",""url"":""/onboarding""},{""action"":""click"",""testId"":""pack-horror""},{""action"":""click"",""testId"":""complete-button""},{""action"":""assertUrl"",""pattern"":""/recommend""}]",推薦画面に遷移する,critical,
```

## テストケース

- [ ] プロンプトテンプレートが文書化されている
- [ ] 入力（仕様書）から出力（CSV）への変換例が存在する
- [ ] StepAction型の使用例が網羅されている

## 実装メモ

- プロンプトは `.ai/prompts/gen-testcases.md` に配置
- 将来的にはfew-shot例を追加して精度向上
- data-testid の命名は既存コンポーネントを参照
