#!/bin/bash

# DynamoDB Localのデータをバックアップからリストアするスクリプト
# 事前にdynamodumpコンテナが必要
docker compose run --rm dynamodump -m restore \
  -r local -s "*" --host dynamodb-local --port 8000 \
  --accessKey fakeMyKeyId --secretKey fakeSecretAccessKey --noConfirm

