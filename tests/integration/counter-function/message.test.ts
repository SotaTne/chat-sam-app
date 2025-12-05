import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { MessageRepository } from "../../../functions/counter-function/repository/message";
import {
  setupIntegrationTest,
  teardownIntegrationTest,
  createDocumentClient,
  resetTestData,
} from "../shared/setup";
import { healthCheck } from "./utils";

describe("Counter Function MessageRepository Integration Tests", () => {
  let dynamoClient: DynamoDBClient;
  let docClient: DynamoDBDocumentClient;
  let messageRepository: MessageRepository;
  const tableName = "chat-sam-app-MessageTable";

  beforeAll(async () => {
    // ヘルスチェック
    const isHealthy = await healthCheck();
    if (!isHealthy) {
      throw new Error("❌ DynamoDB Local is not accessible");
    }

    // 統合テスト環境をセットアップ
    dynamoClient = await setupIntegrationTest();
    docClient = createDocumentClient();
    messageRepository = new MessageRepository(docClient);
  });

  beforeEach(async () => {
    // 各テスト前にデータをリセット
    await resetTestData(dynamoClient);
  });

  afterAll(async () => {
    await teardownIntegrationTest(dynamoClient);
  });

  describe("getMessagesFromTimeStampRange", () => {
    test("指定した時間範囲のメッセージを取得できること", async () => {
      // Arrange: 明確に異なる時刻でメッセージを事前登録
      const baseTime = Math.floor(Date.now() / 1000);

      const testMessages = [
        {
          MessageNo: 1,
          UserId: "user1",
          Content: "Message 1",
          CreatedAt: baseTime - 3600,
          Dummy: "ALL",
        }, // 1時間前
        {
          MessageNo: 2,
          UserId: "user2",
          Content: "Message 2",
          CreatedAt: baseTime - 1800,
          Dummy: "ALL",
        }, // 30分前
        {
          MessageNo: 3,
          UserId: "user1",
          Content: "Message 3",
          CreatedAt: baseTime - 600,
          Dummy: "ALL",
        }, // 10分前
        {
          MessageNo: 4,
          UserId: "user3",
          Content: "Message 4",
          CreatedAt: baseTime + 600,
          Dummy: "ALL",
        }, // 10分後（未来）
      ];

      // PutCommandでテストデータを直接登録
      for (const message of testMessages) {
        await docClient.send(
          new PutCommand({
            TableName: tableName,
            Item: message,
          })
        );
      }

      // Act: 45分前から5分前までの範囲で検索
      const startTime = baseTime - 2700; // 45分前
      const endTime = baseTime - 300; // 5分前
      const result = await messageRepository.getMessagesFromTimeStampRange(
        startTime,
        endTime
      );

      // Assert: 30分前と10分前のメッセージが取得されること
      expect(result).toHaveLength(2);
      expect(result[0].MessageNo).toBe(2); // 30分前のメッセージ
      expect(result[1].MessageNo).toBe(3); // 10分前のメッセージ
      expect(result[0].UserId).toBe("user2");
      expect(result[1].UserId).toBe("user1");
    });

    test("範囲外の場合は空配列を返すこと", async () => {
      // Arrange: テストメッセージを登録
      const baseTime = Math.floor(Date.now() / 1000);

      await docClient.send(
        new PutCommand({
          TableName: tableName,
          Item: {
            MessageNo: 1,
            UserId: "user1",
            Content: "Message 1",
            CreatedAt: baseTime,
            Dummy: "ALL",
          },
        })
      );

      // Act: 範囲外の時刻で検索
      const result = await messageRepository.getMessagesFromTimeStampRange(
        baseTime + 3600,
        baseTime + 7200
      );

      // Assert: 空配列が返されること
      expect(result).toHaveLength(0);
    });

    test("不正な時間範囲でエラーを投げること", async () => {
      // Act & Assert: startTimestamp > endTimestamp の場合はエラー
      await expect(
        messageRepository.getMessagesFromTimeStampRange(100, 50)
      ).rejects.toThrow("startTimestamp must be <= endTimestamp");
    });

    test("同じ時刻の複数メッセージが正しく取得されること", async () => {
      // Arrange: 同じ時刻のメッセージを複数登録
      const sameTime = Math.floor(Date.now() / 1000);

      const messages = [
        {
          MessageNo: 1,
          UserId: "user1",
          Content: "Message 1",
          CreatedAt: sameTime,
          Dummy: "ALL",
        },
        {
          MessageNo: 2,
          UserId: "user2",
          Content: "Message 2",
          CreatedAt: sameTime,
          Dummy: "ALL",
        },
        {
          MessageNo: 3,
          UserId: "user3",
          Content: "Message 3",
          CreatedAt: sameTime,
          Dummy: "ALL",
        },
      ];

      for (const message of messages) {
        await docClient.send(
          new PutCommand({
            TableName: tableName,
            Item: message,
          })
        );
      }

      // Act: 同じ時刻を含む範囲で検索
      const result = await messageRepository.getMessagesFromTimeStampRange(
        sameTime,
        sameTime
      );

      // Assert: 3件のメッセージが取得されること
      expect(result).toHaveLength(3);
      const userIds = result.map((msg) => msg.UserId).sort();
      expect(userIds).toEqual(["user1", "user2", "user3"]);
    });
  });

  describe("パフォーマンステスト", () => {
    test("大量データでも正常に動作すること", async () => {
      // Arrange: 大量のテストデータを登録
      const baseTime = Math.floor(Date.now() / 1000);

      const messages = Array.from({ length: 50 }, (_, i) => ({
        MessageNo: i + 1,
        UserId: `user${(i % 10) + 1}`, // 10人のユーザーが循環
        Content: `Test message ${i + 1}`,
        CreatedAt: baseTime - i * 60, // 1分ずつ過去にずらす
        Dummy: "ALL",
      }));

      // バッチでデータを登録
      for (const message of messages) {
        await docClient.send(
          new PutCommand({
            TableName: tableName,
            Item: message,
          })
        );
      }

      // Act: 広い範囲で検索
      const result = await messageRepository.getMessagesFromTimeStampRange(
        baseTime - 3000,
        baseTime
      );

      // Assert: 期待される件数が取得されること
      expect(result.length).toBeGreaterThan(0);
      expect(result.length).toBeLessThanOrEqual(50);

      // 時刻順でソートされていることを確認
      for (let i = 1; i < result.length; i++) {
        expect(result[i].CreatedAt).toBeGreaterThanOrEqual(
          result[i - 1].CreatedAt
        );
      }
    });
  });
});
