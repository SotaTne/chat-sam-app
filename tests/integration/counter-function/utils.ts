// tests/integration/counter-function/utils.ts
// counter-function専用のユーティリティ（必要に応じて共通ユーティリティをラップ）
import { healthCheck as sharedHealthCheck } from "../shared/db";

export const TABLE_NAMES = [
  "chat-sam-app-MessageTable",
  "chat-sam-app-CounterRangeTable",
] as const;

export type TableName = (typeof TABLE_NAMES)[number];

// 共通のヘルスチェックをラップ
export const healthCheck = sharedHealthCheck;