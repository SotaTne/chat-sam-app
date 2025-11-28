#!/bin/sh
# init-dynamodb-local.sh
# DynamoDB Local 用テーブル作成 + TTL 設定（再実行可能）

# --------------------------
# .env から値を取得（デフォルトあり）
# --------------------------
ENDPOINT="${DYNAMODB_ENDPOINT:-http://dynamodb-local:8000}"
REGION="${DYNAMODB_REGION:-ap-northeast-1}"
AWS_ACCESS_KEY_ID="${DYNAMODB_ACCESS_KEY_ID:-dummy}"
AWS_SECRET_ACCESS_KEY="${DYNAMODB_SECRET_ACCESS_KEY:-dummy}"

export AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY

wait_for_dynamodb() {
  echo "Waiting for DynamoDB Local to start..."
  while ! curl -s "$ENDPOINT" >/dev/null; do
    sleep 1
  done
  echo "DynamoDB Local is up!"
}

create_table_if_not_exists() {
  TABLE_NAME=$1
  JSON_FILE=$2

  if aws dynamodb list-tables --endpoint-url "$ENDPOINT" --region "$REGION" \
       | grep -q "\"$TABLE_NAME\""; then
    echo "Table $TABLE_NAME already exists. Skipping creation."
  else
    echo "Creating $TABLE_NAME..."
    aws dynamodb create-table \
      --cli-input-json file://"$JSON_FILE" \
      --endpoint-url "$ENDPOINT" \
      --region "$REGION"
  fi
}

set_ttl_if_not_set() {
  TABLE_NAME=$1
  TTL_ATTRIBUTE=$2

  TTL_STATUS=$(aws dynamodb describe-time-to-live \
    --table-name "$TABLE_NAME" \
    --endpoint-url "$ENDPOINT" \
    --region "$REGION" \
    | jq -r '.TimeToLiveDescription.TimeToLiveStatus')

  if [ "$TTL_STATUS" = "ENABLED" ]; then
    echo "TTL already enabled on $TABLE_NAME. Skipping."
  else
    echo "Setting TTL for $TABLE_NAME..."
    aws dynamodb update-time-to-live \
      --table-name "$TABLE_NAME" \
      --time-to-live-specification "Enabled=true, AttributeName=$TTL_ATTRIBUTE" \
      --endpoint-url "$ENDPOINT" \
      --region "$REGION"
  fi
}

# --------------------------
# 実行
# --------------------------
wait_for_dynamodb

create_table_if_not_exists "MessageTable"        "/tmp/MessageTable.json"
create_table_if_not_exists "SessionTable"        "/tmp/SessionTable.json"
create_table_if_not_exists "MessageCounterTable" "/tmp/MessageCounterTable.json"
create_table_if_not_exists "CounterRangeTable"   "/tmp/CounterRangeTable.json"

set_ttl_if_not_set "SessionTable" "ExpirationDate"
set_ttl_if_not_set "CounterRangeTable" "CreatedAt"

echo "DynamoDB Local initialization complete."