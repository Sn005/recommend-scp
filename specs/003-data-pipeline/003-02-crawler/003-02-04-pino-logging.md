# Subtask: 003-02-04 pinoロギング導入

## 概要

- **ID**: 003-02-04
- **名前**: pinoロギング導入
- **ステータス**: completed
- **依存**: 003-02-02

## ユーザーストーリー

**As a** 運用担当者
**I want** 構造化ログでクローラーの実行状況を把握する
**So that** GitHub ActionsやCloudWatch等で効率的にログ分析できる

## Acceptance Criteria（EARS記法）

### pino導入

- [x] WHEN pipelineパッケージをビルドした際
      THEN pinoがサーバーサイド用ライブラリとして含まれる
      AND クライアントサイド（ブラウザ）では使用されない

- [x] WHEN ロガーを初期化した際
      GIVEN 環境変数 LOG_LEVEL が設定されている場合
      THEN 指定されたレベル（debug/info/warn/error）で動作する

### 構造化ログ

- [x] WHEN クロール処理のログを出力した際
      THEN JSON形式で出力される
      AND timestamp, level, message, context を含む

- [x] WHEN エラーログを出力した際
      GIVEN Errorオブジェクトが渡された場合
      THEN スタックトレースも含まれる

### ラッパー移行

- [x] WHEN 既存の logger ラッパーを更新した際
      THEN createLogger の内部実装がpinoに変更される
      AND 呼び出し側のコードは変更不要

- [x] WHEN silent オプションを指定した際
      THEN ログ出力が無効化される（テスト用）

### GitHub Actions対応

- [x] WHEN GitHub Actionsで実行された際
      THEN ログがworkflowログに出力される
      AND 重要なログはサマリーにも表示される

## 設計

### ディレクトリ構造

```
packages/pipeline/src/
  crawler/
    utils/
      logger.ts          # pinoラッパーに更新（既存）
```

### 依存関係

```json
{
  "dependencies": {
    "pino": "^10.x"
  },
  "devDependencies": {
    "pino-pretty": "^13.x"
  }
}
```

### 実装例

```typescript
import pino from "pino";

export const createLogger = (options: LoggerOptions = {}): Logger => {
  const { prefix = "", level = "info", silent = false } = options;

  const pinoInstance = pino({
    level: silent ? "silent" : level,
    transport: {
      target: "pino-pretty",
      options: { colorize: true },
    },
  });

  return {
    debug: (message, ...args) => pinoInstance.debug({ prefix, args }, message),
    info: (message, ...args) => pinoInstance.info({ prefix, args }, message),
    warn: (message, ...args) => pinoInstance.warn({ prefix, args }, message),
    error: (message, ...args) => pinoInstance.error({ prefix, args }, message),
  };
};
```

## テストケース

- [x] pino経由でログが出力される
- [x] ログレベルの設定が機能する
- [x] silentモードでログが抑制される
- [x] JSON形式で出力される（pino-prettyなし時）
- [x] 既存のテストが引き続き通る

## 実装状況

- **status**: completed
- **完了日**: 2026-01-16
- **実装ファイル**:
  - `packages/pipeline/src/crawler/utils/logger.ts` - pinoベースに移行
  - `packages/pipeline/src/crawler/utils/__dev__/logger.test.ts` - テスト追加

## 備考

- 現在のlogger.tsはconsole.logのラッパーとして実装済み
- pino導入時は内部実装のみ変更、インターフェースは維持
- 本番環境ではpino-prettyを無効化してJSON出力
