#!/bin/bash
# UserPromptSubmit hook - プロンプトに応じたリマインダーを表示
# Claude Codeが自動発動すべきSkillを忘れないためのフック

# Read hook input from stdin
INPUT=$(cat)
PROMPT=$(echo "$INPUT" | jq -r '.prompt // empty')

# Pattern 1: 実装開始キーワード
if echo "$PROMPT" | grep -qE '実装して|開発して|作成して|Subtask.*開始|[0-9]{3}-[0-9]{2}-[0-9]{2}'; then
  echo '⚠️ リマインダー: spec-workflow Skillを発動してください。直接実装を始めないでください。'
  exit 0
fi

# Pattern 2: PR作成キーワード
if echo "$PROMPT" | grep -qiE 'PR.*作成|プルリク|pull.?request'; then
  echo '⚠️ リマインダー: PR作成前に code-reviewer と quality-gate サブエージェントを実行してください。'
  exit 0
fi

# Pattern 3: 仕様策定キーワード
if echo "$PROMPT" | grep -qE '仕様.*策定|spec.*作成|仕様書'; then
  echo '⚠️ リマインダー: /spec Skillを発動してください。'
  exit 0
fi

# No matching pattern - no output
exit 0
