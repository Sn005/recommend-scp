#!/bin/bash
# PreToolUse hook - 危険なBashコマンドをブロック
# エージェントの判断に依存しないガードレール

# Read hook input from stdin
INPUT=$(cat)
TOOL=$(echo "$INPUT" | jq -r '.tool // empty')

# Bash以外はスキップ
if [[ "$TOOL" != "Bash" ]]; then
  exit 0
fi

COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# コマンドが空ならスキップ
if [[ -z "$COMMAND" ]]; then
  exit 0
fi

# 破壊的コマンドのパターンチェック
# rm -rf（フラグ順序不問、スペース区切りの -r -f も検出）
if echo "$COMMAND" | grep -qE '\brm\b' && \
   echo "$COMMAND" | grep -qE '(\s-[a-zA-Z]*r|-r\b|--recursive)' && \
   echo "$COMMAND" | grep -qE '(\s-[a-zA-Z]*f|-f\b|--force)'; then
  echo "🚫 [BLOCKED] rm -rf を検出しました。ファイル削除は慎重に行ってください。個別ファイルの rm は許可されています。" >&2
  exit 2
fi

# git reset --hard
if echo "$COMMAND" | grep -qE 'git\s+reset\s+--hard'; then
  echo "🚫 [BLOCKED] git reset --hard を検出しました。コミットされていない変更が失われます。git stash を検討してください。" >&2
  exit 2
fi

# git push --force / -f
if echo "$COMMAND" | grep -qE 'git\s+push\s+.*(-f|--force)\b'; then
  echo "🚫 [BLOCKED] git push --force を検出しました。リモート履歴が破壊される可能性があります。--force-with-lease を検討してください。" >&2
  exit 2
fi

# git clean -f
if echo "$COMMAND" | grep -qE 'git\s+clean\s+-[a-zA-Z]*f'; then
  echo "🚫 [BLOCKED] git clean -f を検出しました。未追跡ファイルが削除されます。git clean -n で確認してから実行してください。" >&2
  exit 2
fi

# git checkout -- . / git restore .（全ファイル復元）
if echo "$COMMAND" | grep -qE 'git\s+(checkout\s+--\s*\.|restore\s+\.)'; then
  echo "🚫 [BLOCKED] 全ファイルの変更破棄を検出しました。個別ファイルの復元を検討してください。" >&2
  exit 2
fi

# git branch -D（強制削除）
if echo "$COMMAND" | grep -qE 'git\s+branch\s+-D\b'; then
  echo "🚫 [BLOCKED] git branch -D を検出しました。マージされていないブランチが失われます。-d を使用してください。" >&2
  exit 2
fi

# chmod 777
if echo "$COMMAND" | grep -qE 'chmod\s+777'; then
  echo "🚫 [BLOCKED] chmod 777 を検出しました。セキュリティリスクがあります。適切なパーミッション (755, 644等) を使用してください。" >&2
  exit 2
fi

# 許可: 上記に該当しないコマンド
exit 0
