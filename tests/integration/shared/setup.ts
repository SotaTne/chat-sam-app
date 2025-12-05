// tests/integration/shared/setup.ts
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  setupFromDump,
  teardownDump,
  createDynamoClient,
  createDocumentClient,
  cleanupAllTables,
} from "./db";

// integration testsのための統一セットアップ関数
export async function setupIntegrationTest(): Promise<DynamoDBClient> {
  console.log("🚀 Setting up integration test environment...");

  try {
    const client = await setupFromDump();
    console.log("✅ Integration test setup completed");
    return client;
  } catch (error) {
    console.error("❌ Integration test setup failed:", error);
    throw error;
  }
}

// テスト間のデータリセット用関数
export async function resetTestData(client?: DynamoDBClient): Promise<void> {
  const testClient = client || createDynamoClient();
  try {
    // 全テーブルをクリーンアップしてダンプファイルから再セットアップ
    await setupFromDump(undefined, testClient);
  } catch (error) {
    console.error("❌ Test data reset failed:", error);
    throw error;
  } finally {
    if (!client) {
      testClient.destroy();
    }
  }
}

// integration testsのための統一クリーンアップ関数
export async function teardownIntegrationTest(
  client: DynamoDBClient
): Promise<void> {
  console.log("🧹 Cleaning up integration test environment...");

  try {
    await teardownDump(client);
    console.log("✅ Integration test cleanup completed");
  } catch (error) {
    console.error("❌ Integration test cleanup failed:", error);
    throw error;
  }
}

// 便利なエクスポート
export { createDynamoClient, createDocumentClient } from "./db";
