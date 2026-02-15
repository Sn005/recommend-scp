# Subtask 011-01-03: CI統合

## 概要

GitHub ActionsでE2Eテストを自動実行し、正常系テスト失敗時にマージをブロックする。

## ユーザーストーリー

**ペルソナ**: 開発者
**目的**: PRマージ前にE2Eテストを自動実行する
**価値**: リグレッションを自動検知できる
**理由**: 手動テストの工数を削減し、品質を担保したい

## 受け入れ条件（EARS記法）

- [x] WHEN PRがプッシュされた際
      GIVEN GitHub Actionsワークフローが設定されている場合
      THEN E2Eテストが自動実行される
      AND ユニットテスト完了後に実行される

- [x] WHEN E2Eテストが失敗した際
      GIVEN 失敗が正常系テスト（tags=critical）の場合
      THEN PRマージがブロックされる

- [x] WHEN E2Eテストが失敗した際
      GIVEN 失敗が非正常系テスト（tags≠critical）の場合
      THEN 警告のみ表示しマージは許可される

- [x] WHEN E2Eテストが完了した際
      GIVEN テスト結果レポートが生成された場合
      THEN GitHub Actionsのアーティファクトとして保存される

## 設計

### GitHub Actions ワークフロー

```yaml
# .github/workflows/ci.yml に追加

e2e:
  name: E2E Tests
  runs-on: ubuntu-latest
  needs: ci # ユニットテスト後に実行
  steps:
    - uses: actions/checkout@v4

    - uses: pnpm/action-setup@v4

    - uses: actions/setup-node@v4
      with:
        node-version: "20"
        cache: "pnpm"

    - name: Install dependencies
      run: pnpm install --frozen-lockfile

    - name: Install Playwright Browsers
      run: pnpm --filter web exec playwright install --with-deps chromium

    - name: Build
      run: pnpm --filter web build

    - name: Run E2E Tests
      run: pnpm --filter web test:e2e

    - name: Upload Test Results
      uses: actions/upload-artifact@v4
      if: always()
      with:
        name: playwright-report
        path: apps/web/playwright-report/
        retention-days: 7
```

### 正常系/非正常系の分離

```yaml
# 正常系（ブロッカー）
- name: Run Critical E2E Tests
  run: pnpm --filter web test:e2e --grep @critical

# 非正常系（警告のみ）
- name: Run Non-Critical E2E Tests
  run: pnpm --filter web test:e2e --grep-invert @critical
  continue-on-error: true
```

## テストケース

- [x] PRプッシュ時にE2Eテストが自動実行される
- [x] ユニットテスト完了後にE2Eテストが実行される
- [x] 正常系テスト失敗でPRマージがブロックされる
- [x] テスト結果レポートがアーティファクトに保存される

## 実装メモ

- `needs: ci` でユニットテスト後に実行
- Chromiumのみインストール（高速化）
- `playwright-report/` をアーティファクトとして保存
- `@critical` タグでテストを分類

## 実装状況

- **status**: completed
