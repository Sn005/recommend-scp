#!/bin/bash
# PostToolUse hook - Edit/Write後にESLintを実行し即時フィードバック
# ファイル編集のたびにlintを走らせ、エージェントの自己修正ループを閉じる

# Read hook input from stdin
INPUT=$(cat)
TOOL=$(echo "$INPUT" | jq -r '.tool // empty')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

# Edit/Write以外はスキップ
if [[ "$TOOL" != "Edit" && "$TOOL" != "Write" ]]; then
  exit 0
fi

# ファイルパスが空ならスキップ
if [[ -z "$FILE_PATH" ]]; then
  exit 0
fi

# TypeScript/TSXファイル以外はスキップ
if [[ "$FILE_PATH" != *.ts && "$FILE_PATH" != *.tsx ]]; then
  exit 0
fi

# eslint.config.mjsのignoresと同じパターンを除外
case "$FILE_PATH" in
  */node_modules/* | */dist/* | */.next/* | */supabase/* | */coverage/*)
    exit 0
    ;;
  *.js | *.mjs)
    exit 0
    ;;
  */packages/poc/* | */packages/shared/* | */scripts/*)
    exit 0
    ;;
  */vitest.config.ts)
    exit 0
    ;;
esac

# ファイルが存在しない場合はスキップ（削除された可能性）
if [[ ! -f "$FILE_PATH" ]]; then
  exit 0
fi

# ESLint実行（単一ファイル、Turborepoオーバーヘッド回避）
LINT_OUTPUT=$(cd "$CLAUDE_PROJECT_DIR" && npx eslint --no-error-on-unmatched-pattern "$FILE_PATH" 2>&1)
LINT_EXIT=$?

if [[ $LINT_EXIT -ne 0 && -n "$LINT_OUTPUT" ]]; then
  echo "⚠️ ESLint エラーを検出しました。修正してください:" >&2
  echo "$LINT_OUTPUT" >&2
  echo "" >&2
  echo "💡 よくある対処法:" >&2
  echo "  - no-console → createLogger() を使用 (packages/pipeline/src/crawler/utils/logger.ts)" >&2
  echo "  - n/no-process-env → env.ts 経由でアクセス (packages/shared/src/lib/env.ts)" >&2
  echo "  - no-explicit-any → 具体的な型を定義" >&2
  echo "  - no-floating-promises → await を追加" >&2
fi

# PostToolUseは常にexit 0（情報提供のみ、ブロックしない）
exit 0
