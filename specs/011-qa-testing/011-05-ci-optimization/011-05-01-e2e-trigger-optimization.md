# Subtask 011-05-01: E2Eテスト実行タイミングの最適化

## 概要

`.github/workflows/ci.yml` を修正し、E2Eテストの実行をPR時のみに限定する。mainプッシュ時はunit test/lint/type-checkのみ実行する。

## ユーザーストーリー

**ペルソナ**: 開発者
**目的**: mainマージ時のE2Eテスト二重実行を解消する
**価値**: CI実行時間とGitHub Actionsコストを削減できる
**理由**: PRで検証済みの同一コードを再テストする必要がない

## 受け入れ条件（EARS記法）

- [ ] WHEN PRが作成/更新された際
      GIVEN E2Eテストケースが存在する場合
      THEN ci ジョブ（lint, format, type-check, unit test）が実行される
      AND e2e ジョブ（Playwright）が実行される

- [ ] WHEN mainブランチにプッシュされた際
      GIVEN マージコミットの場合
      THEN ci ジョブ（lint, format, type-check, unit test）のみ実行される
      AND e2e ジョブは実行されない

- [ ] WHEN e2e ジョブの実行条件を変更した際
      GIVEN 既存のテストケースが存在する場合
      THEN PR上での @critical テストの失敗はマージをブロックする
      AND 既存の動作が維持される

## 設計

### 変更対象

`.github/workflows/ci.yml` の `e2e` ジョブに条件を追加する。

### 変更内容

```yaml
# Before（現状）
e2e:
  name: E2E Tests
  runs-on: ubuntu-latest
  needs: ci
  steps:
    # ...

# After（修正後）
e2e:
  name: E2E Tests
  runs-on: ubuntu-latest
  needs: ci
  if: github.event_name == 'pull_request'
  steps:
    # ...（既存のステップは変更なし）
```

### 変更の影響

| トリガー      | ci ジョブ | e2e ジョブ   | 変更         |
| ------------- | --------- | ------------ | ------------ |
| PR to main    | 実行      | 実行         | 変更なし     |
| PR to spec/\* | 実行      | 実行         | 変更なし     |
| PR to impl/\* | 実行      | 実行         | 変更なし     |
| Push to main  | 実行      | **スキップ** | **変更あり** |

### リスク評価

| リスク                                         | 影響度 | 発生頻度                 | 対策                                 |
| ---------------------------------------------- | ------ | ------------------------ | ------------------------------------ |
| PRチェック後にmainが変わり、マージ結果が壊れる | 低     | 低（少人数チーム）       | unit testがmainで実行される          |
| 直接mainにプッシュした場合E2Eが走らない        | 中     | 極低（ブランチ保護あり） | ブランチ保護ルールで直接プッシュ禁止 |

## テストケース

- [ ] PRプッシュ時にe2eジョブが実行される
- [ ] mainマージ時にe2eジョブがスキップされる
- [ ] mainマージ時にciジョブは実行される
- [ ] e2eジョブの既存ステップに変更がない

## 実装メモ

- 変更は `if: github.event_name == 'pull_request'` の1行追加のみ
- `concurrency` の `cancel-in-progress: true` は維持（PR更新時に前回実行をキャンセル）
- unit testのmain実行を維持することで、マージ後のコード整合性を最低限保証
