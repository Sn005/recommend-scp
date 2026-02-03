#!/bin/bash
# github-issue.sh - GitHub API を使用したIssue操作スクリプト
# GITHUB_TOKEN 環境変数が必要

set -e

REPO="${GITHUB_REPO:-Sn005/recommend-scp}"
API_BASE="https://api.github.com"

# 認証ヘッダー
auth_header() {
  echo "Authorization: token $GITHUB_TOKEN"
}

# 使用方法
usage() {
  cat <<EOF
Usage: $0 <command> [options]

Commands:
  create    --title <title> --body <body> [--labels <labels>]
            Issue を作成
            --labels: カンマ区切りのラベル（例: "type:ui-bug,major"）

  list      [--labels <labels>] [--state <open|closed|all>]
            Issue 一覧を取得
            --labels: フィルタするラベル（カンマ区切り）
            --state: 状態（デフォルト: open）

  get       --number <issue_number>
            Issue 詳細を取得

  update    --number <issue_number> [--add-labels <labels>] [--remove-labels <labels>]
            Issue ラベルを更新
            --add-labels: 追加するラベル（カンマ区切り）
            --remove-labels: 削除するラベル（カンマ区切り）

  comment   --number <issue_number> --body <body>
            Issue にコメントを追加

  close     --number <issue_number> [--reason <reason>]
            Issue をクローズ

  check     認証状態を確認

Examples:
  $0 create --title "[screen:recommend] ボタンの色が薄い" --body "## 概要..." --labels "type:ui-bug,major"
  $0 list --labels "type:ui-bug,status:open"
  $0 update --number 42 --add-labels "status:fixed" --remove-labels "status:open"
  $0 close --number 42 --reason "修正完了"
EOF
  exit 1
}

# 認証確認
cmd_check() {
  if [ -z "$GITHUB_TOKEN" ]; then
    echo "ERROR: GITHUB_TOKEN environment variable is not set" >&2
    exit 1
  fi

  local response
  response=$(curl -s -H "$(auth_header)" "$API_BASE/user")
  local login
  login=$(echo "$response" | jq -r '.login // empty')

  if [ -z "$login" ]; then
    echo "ERROR: Authentication failed" >&2
    echo "$response" | jq -r '.message // .' >&2
    exit 1
  fi

  echo "Authenticated as: $login"
  echo "Repository: $REPO"
}

# Issue作成
cmd_create() {
  local title="" body="" labels=""

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --title) title="$2"; shift 2 ;;
      --body) body="$2"; shift 2 ;;
      --labels) labels="$2"; shift 2 ;;
      *) shift ;;
    esac
  done

  if [ -z "$title" ]; then
    echo "ERROR: --title is required" >&2
    exit 1
  fi

  # ラベル配列を構築
  local labels_json="[]"
  if [ -n "$labels" ]; then
    labels_json=$(echo "$labels" | jq -R 'split(",")')
  fi

  # リクエストボディ
  local payload
  payload=$(jq -n \
    --arg title "$title" \
    --arg body "$body" \
    --argjson labels "$labels_json" \
    '{title: $title, body: $body, labels: $labels}')

  local response
  response=$(curl -s -X POST \
    -H "$(auth_header)" \
    -H "Content-Type: application/json" \
    -d "$payload" \
    "$API_BASE/repos/$REPO/issues")

  local issue_number
  issue_number=$(echo "$response" | jq -r '.number // empty')

  if [ -z "$issue_number" ]; then
    echo "ERROR: Failed to create issue" >&2
    echo "$response" | jq -r '.message // .' >&2
    exit 1
  fi

  local issue_url
  issue_url=$(echo "$response" | jq -r '.html_url')

  echo "Issue #$issue_number created: $issue_url"
  echo "$response" | jq '{number, title, html_url, labels: [.labels[].name]}'
}

# Issue一覧取得
cmd_list() {
  local labels="" state="open"

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --labels) labels="$2"; shift 2 ;;
      --state) state="$2"; shift 2 ;;
      *) shift ;;
    esac
  done

  local url="$API_BASE/repos/$REPO/issues?state=$state"
  if [ -n "$labels" ]; then
    url="$url&labels=$labels"
  fi

  local response
  response=$(curl -s -H "$(auth_header)" "$url")

  # PRを除外してIssueのみ表示
  echo "$response" | jq '[.[] | select(.pull_request == null) | {number, title, html_url, labels: [.labels[].name], state}]'
}

# Issue詳細取得
cmd_get() {
  local number=""

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --number) number="$2"; shift 2 ;;
      *) shift ;;
    esac
  done

  if [ -z "$number" ]; then
    echo "ERROR: --number is required" >&2
    exit 1
  fi

  local response
  response=$(curl -s -H "$(auth_header)" "$API_BASE/repos/$REPO/issues/$number")

  echo "$response" | jq '{number, title, body, html_url, labels: [.labels[].name], state}'
}

# ラベル更新
cmd_update() {
  local number="" add_labels="" remove_labels=""

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --number) number="$2"; shift 2 ;;
      --add-labels) add_labels="$2"; shift 2 ;;
      --remove-labels) remove_labels="$2"; shift 2 ;;
      *) shift ;;
    esac
  done

  if [ -z "$number" ]; then
    echo "ERROR: --number is required" >&2
    exit 1
  fi

  # 現在のラベルを取得
  local current
  current=$(curl -s -H "$(auth_header)" "$API_BASE/repos/$REPO/issues/$number")
  local current_labels
  current_labels=$(echo "$current" | jq '[.labels[].name]')

  # ラベルを更新
  local new_labels="$current_labels"

  # ラベル削除
  if [ -n "$remove_labels" ]; then
    local remove_array
    remove_array=$(echo "$remove_labels" | jq -R 'split(",")')
    new_labels=$(echo "$new_labels" | jq --argjson remove "$remove_array" '. - $remove')
  fi

  # ラベル追加
  if [ -n "$add_labels" ]; then
    local add_array
    add_array=$(echo "$add_labels" | jq -R 'split(",")')
    new_labels=$(echo "$new_labels" | jq --argjson add "$add_array" '. + $add | unique')
  fi

  # 更新リクエスト
  local payload
  payload=$(jq -n --argjson labels "$new_labels" '{labels: $labels}')

  local response
  response=$(curl -s -X PATCH \
    -H "$(auth_header)" \
    -H "Content-Type: application/json" \
    -d "$payload" \
    "$API_BASE/repos/$REPO/issues/$number")

  echo "Issue #$number labels updated"
  echo "$response" | jq '{number, title, labels: [.labels[].name]}'
}

# コメント追加
cmd_comment() {
  local number="" body=""

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --number) number="$2"; shift 2 ;;
      --body) body="$2"; shift 2 ;;
      *) shift ;;
    esac
  done

  if [ -z "$number" ] || [ -z "$body" ]; then
    echo "ERROR: --number and --body are required" >&2
    exit 1
  fi

  local payload
  payload=$(jq -n --arg body "$body" '{body: $body}')

  local response
  response=$(curl -s -X POST \
    -H "$(auth_header)" \
    -H "Content-Type: application/json" \
    -d "$payload" \
    "$API_BASE/repos/$REPO/issues/$number/comments")

  local comment_id
  comment_id=$(echo "$response" | jq -r '.id // empty')

  if [ -z "$comment_id" ]; then
    echo "ERROR: Failed to add comment" >&2
    echo "$response" | jq -r '.message // .' >&2
    exit 1
  fi

  echo "Comment added to Issue #$number"
  echo "$response" | jq '{id, html_url, body}'
}

# Issueクローズ
cmd_close() {
  local number="" reason=""

  while [[ $# -gt 0 ]]; do
    case "$1" in
      --number) number="$2"; shift 2 ;;
      --reason) reason="$2"; shift 2 ;;
      *) shift ;;
    esac
  done

  if [ -z "$number" ]; then
    echo "ERROR: --number is required" >&2
    exit 1
  fi

  # コメント追加（理由があれば）
  if [ -n "$reason" ]; then
    cmd_comment --number "$number" --body "**クローズ理由**: $reason"
  fi

  # クローズ
  local payload
  payload=$(jq -n '{state: "closed"}')

  local response
  response=$(curl -s -X PATCH \
    -H "$(auth_header)" \
    -H "Content-Type: application/json" \
    -d "$payload" \
    "$API_BASE/repos/$REPO/issues/$number")

  echo "Issue #$number closed"
  echo "$response" | jq '{number, title, state, html_url}'
}

# メイン
main() {
  if [ -z "$GITHUB_TOKEN" ]; then
    echo "ERROR: GITHUB_TOKEN environment variable is not set" >&2
    echo "Set it with: export GITHUB_TOKEN=your_token" >&2
    exit 1
  fi

  local command="${1:-}"
  shift || true

  case "$command" in
    check) cmd_check "$@" ;;
    create) cmd_create "$@" ;;
    list) cmd_list "$@" ;;
    get) cmd_get "$@" ;;
    update) cmd_update "$@" ;;
    comment) cmd_comment "$@" ;;
    close) cmd_close "$@" ;;
    *) usage ;;
  esac
}

main "$@"
