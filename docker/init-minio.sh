#!/bin/sh
set -e

# --------------------------
# 環境変数（.envから読み込める）
# --------------------------
ENDPOINT="${MINIO_ENDPOINT:-http://minio:9000}"
ALIAS="${MINIO_ALIAS:-myminio}"
USER="${MINIO_ROOT_USER:-user}"
PASS="${MINIO_ROOT_PASSWORD:-password}"
REGION="${MINIO_REGION:-ap-northeast-1}"
ASSETS_DIR="${ASSETS_DIR:-/assets}"  # デフォルトは /assets

export MINIO_ROOT_USER MINIO_ROOT_PASSWORD

# --------------------------
# MinIO 起動待機
# --------------------------
wait_for_minio() {
  echo "Waiting for MinIO to start at $ENDPOINT..."
  while ! curl -s $ENDPOINT >/dev/null; do
    sleep 1
  done
  echo "MinIO is up!"
}

# --------------------------
# MinIO エイリアス設定
# --------------------------
set_minio_alias() {
  echo "Setting MinIO alias '$ALIAS'..."
  mc alias set "$ALIAS" "$ENDPOINT" "$USER" "$PASS" >/dev/null 2>&1 || true
}

# --------------------------
# バケット作成（存在しなければ）
# --------------------------
create_bucket_if_not_exists() {
  BUCKET_NAME=$1
  if mc ls "$ALIAS" | grep -q "$BUCKET_NAME/"; then
    echo "Bucket '$BUCKET_NAME' already exists. Skipping creation."
  else
    echo "Creating bucket '$BUCKET_NAME'..."
    mc mb -p "$ALIAS/$BUCKET_NAME" || true
  fi
}

# --------------------------
# バケットごとにフォルダをアップロード
# --------------------------
upload_initial_assets() {
  if [ -d "$ASSETS_DIR" ]; then
    echo "Uploading initial assets from '$ASSETS_DIR'..."
    for dir in "$ASSETS_DIR"/*/ ; do
      [ -d "$dir" ] || continue  # ディレクトリでなければスキップ
      BUCKET_NAME=$(basename "$dir")
      create_bucket_if_not_exists "$BUCKET_NAME"
      echo "Uploading contents of '$dir' to bucket '$BUCKET_NAME'..."
      mc cp --recursive "$dir" "$ALIAS/$BUCKET_NAME"
    done
  else
    echo "$ASSETS_DIR folder not found. Skipping upload."
  fi
}

# --------------------------
# バケットリージョン設定
# --------------------------
set_region_config() {
  echo "Setting region '$REGION'..."
  mc admin config set "$ALIAS" region name="$REGION" || true
}

# --------------------------
# 実行
# --------------------------
wait_for_minio
set_minio_alias
set_region_config
upload_initial_assets

echo "MinIO initialization complete!"