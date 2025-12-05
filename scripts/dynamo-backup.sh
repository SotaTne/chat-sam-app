#!/usr/bin/env bash
set -e

# --- .env ファイルがあれば読み込む ---
set -a
source .env
set +a

# --- 設定可能変数 (必要に応じて .env または環境変数で設定) ---
TABLE_PATTERN="${TABLE_PATTERN:-chat-sam-app-*}"
DYNAMODB_REGION="${DYNAMODB_REGION:-ap-northeast-1}"
AWS_PROFILE="${AWS_PROFILE:-}"

# 確認表示
echo "→ Using AWS_PROFILE=${AWS_PROFILE:-<none>}"
echo "→ Region = $DYNAMODB_REGION"
echo "→ Table pattern = $TABLE_PATTERN"

# --- 引数組み立て ---
args=( -m backup -r "$DYNAMODB_REGION" -s "$TABLE_PATTERN" )
if [ -n "$AWS_PROFILE" ]; then
  args+=( -p "$AWS_PROFILE" )
fi

# --- 実行 ---
docker compose run --rm dynamodump "${args[@]}"