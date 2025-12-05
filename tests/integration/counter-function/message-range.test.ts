import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";
import {
  MessageRangeRepository,
  MessageRangeItems,
} from "../../../functions/counter-function/repository/message-range";
import {
  setupIntegrationTest,
  teardownIntegrationTest,
  createDocumentClient,
  resetTestData,
} from "../shared/setup";
import { healthCheck } from "./utils";

describe("Counter Function MessageRangeRepository Integration Tests", () => {
  let dynamoClient: DynamoDBClient;
  let docClient: DynamoDBDocumentClient;
  let messageRangeRepository: MessageRangeRepository;
  const tableName = "chat-sam-app-CounterRangeTable";

  beforeAll(async () => {
    // ヘルスチェック
    const isHealthy = await healthCheck();
    if (!isHealthy) {
      throw new Error("❌ DynamoDB Local is not accessible");
    }

    // 統合テスト環境をセットアップ
    dynamoClient = await setupIntegrationTest();
    docClient = createDocumentClient();
    messageRangeRepository = new MessageRangeRepository(docClient);
  });

  beforeEach(async () => {
    // 各テスト前にデータをリセット
    await resetTestData(dynamoClient);
  });

  afterAll(async () => {
    await teardownIntegrationTest(dynamoClient);
  });

  describe("saveCounter", () => {
    test("集計データを正しく保存できること", async () => {
      // Arrange
      const now = new Date();
      const testData: MessageRangeItems = {
        RecordId: "hourly-2024-11-21T12",
        Start: Math.floor(now.getTime() / 1000) - 3600, // 1時間前
        End: Math.floor(now.getTime() / 1000), // 現在
        MessageCount: 150,
        UserCount: 25,
        CreatedAt: Math.floor(now.getTime() / 1000),
        ExpirationDate: new Date(now.getTime() + 24 * 60 * 60 * 1000), // 24時間後
      };

      // Act
      await expect(
        messageRangeRepository.saveCounter(testData)
      ).resolves.not.toThrow();

      // Assert: 保存されたデータを直接確認
      const result = await docClient.send(
        new GetCommand({
          TableName:
            process.env.COUNTER_RANGE_TABLE || "chat-sam-app-CounterRangeTable",
          Key: { RecordId: testData.RecordId },
        })
      );

      expect(result.Item).toBeDefined();
      expect(result.Item!.RecordId).toBe(testData.RecordId);
      expect(result.Item!.MessageCount).toBe(testData.MessageCount);
      expect(result.Item!.UserCount).toBe(testData.UserCount);
      expect(result.Item!.Start).toBe(testData.Start);
      expect(result.Item!.End).toBe(testData.End);
      expect(result.Item!.ExpirationDate).toBe(
        Math.floor(testData.ExpirationDate.getTime() / 1000)
      );
    });

    test("複数の集計データを保存できること", async () => {
      // Arrange: 複数の時間帯の集計データ
      const baseTime = Math.floor(Date.now() / 1000);
      const testDataList: MessageRangeItems[] = [
        {
          RecordId: "hourly-2024-11-21T10",
          Start: baseTime - 7200, // 2時間前
          End: baseTime - 3600, // 1時間前
          MessageCount: 100,
          UserCount: 20,
          CreatedAt: baseTime - 3600,
          ExpirationDate: new Date((baseTime + 86400) * 1000),
        },
        {
          RecordId: "hourly-2024-11-21T11",
          Start: baseTime - 3600, // 1時間前
          End: baseTime, // 現在
          MessageCount: 200,
          UserCount: 35,
          CreatedAt: baseTime,
          ExpirationDate: new Date((baseTime + 86400) * 1000),
        },
        {
          RecordId: "hourly-2024-11-21T12",
          Start: baseTime, // 現在
          End: baseTime + 3600, // 1時間後
          MessageCount: 0, // まだメッセージなし
          UserCount: 0,
          CreatedAt: baseTime,
          ExpirationDate: new Date((baseTime + 86400) * 1000),
        },
      ];

      // Act: 複数の集計データを保存
      for (const data of testDataList) {
        await messageRangeRepository.saveCounter(data);
      }

      // Assert: 全てのデータが正しく保存されていることを確認
      for (const expectedData of testDataList) {
        const result = await docClient.send(
          new GetCommand({
            TableName:
              process.env.COUNTER_RANGE_TABLE ||
              "chat-sam-app-CounterRangeTable",
            Key: { RecordId: expectedData.RecordId },
          })
        );

        expect(result.Item).toBeDefined();
        expect(result.Item!.MessageCount).toBe(expectedData.MessageCount);
        expect(result.Item!.UserCount).toBe(expectedData.UserCount);
      }
    });

    test("同じRecordIdで上書き保存されること", async () => {
      // Arrange: 初期データ
      const recordId = "hourly-2024-11-21T13";
      const baseTime = Math.floor(Date.now() / 1000);

      const initialData: MessageRangeItems = {
        RecordId: recordId,
        Start: baseTime - 3600,
        End: baseTime,
        MessageCount: 100,
        UserCount: 20,
        CreatedAt: baseTime,
        ExpirationDate: new Date((baseTime + 86400) * 1000),
      };

      const updatedData: MessageRangeItems = {
        RecordId: recordId, // 同じRecordId
        Start: baseTime - 3600,
        End: baseTime,
        MessageCount: 250, // 更新された値
        UserCount: 45, // 更新された値
        CreatedAt: baseTime + 60,
        ExpirationDate: new Date((baseTime + 86400) * 1000),
      };

      // Act: 初回保存
      await messageRangeRepository.saveCounter(initialData);

      // 同じRecordIdで更新保存
      await messageRangeRepository.saveCounter(updatedData);

      // Assert: 最新の値で上書きされていることを確認
      const result = await docClient.send(
        new GetCommand({
          TableName:
            process.env.COUNTER_RANGE_TABLE || "chat-sam-app-CounterRangeTable",
          Key: { RecordId: recordId },
        })
      );

      expect(result.Item).toBeDefined();
      expect(result.Item!.MessageCount).toBe(updatedData.MessageCount);
      expect(result.Item!.UserCount).toBe(updatedData.UserCount);
      expect(result.Item!.CreatedAt).toBe(updatedData.CreatedAt);
    });

    test("ExpirationDateがUnixタイムスタンプに正しく変換されること", async () => {
      // Arrange
      const now = new Date();
      const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7日後
      const testData: MessageRangeItems = {
        RecordId: "hourly-2024-11-21T14",
        Start: Math.floor(now.getTime() / 1000) - 3600,
        End: Math.floor(now.getTime() / 1000),
        MessageCount: 75,
        UserCount: 15,
        CreatedAt: Math.floor(now.getTime() / 1000),
        ExpirationDate: futureDate,
      };

      // Act
      await messageRangeRepository.saveCounter(testData);

      // Assert: ExpirationDateがUnixタイムスタンプ（秒）に正しく変換されて保存されていること
      const result = await docClient.send(
        new GetCommand({
          TableName:
            process.env.COUNTER_RANGE_TABLE || "chat-sam-app-CounterRangeTable",
          Key: { RecordId: testData.RecordId },
        })
      );

      expect(result.Item).toBeDefined();
      expect(result.Item!.ExpirationDate).toBe(
        Math.floor(futureDate.getTime() / 1000)
      );

      // 元のDateオブジェクトと同じ時刻を表していることを確認
      const savedDate = new Date(result.Item!.ExpirationDate * 1000);
      expect(Math.floor(savedDate.getTime() / 1000)).toBe(
        Math.floor(futureDate.getTime() / 1000)
      );
    });

    test("ゼロ値の集計データも正常に保存できること", async () => {
      // Arrange: メッセージもユーザーもいない時間帯のデータ
      const now = new Date();
      const testData: MessageRangeItems = {
        RecordId: "hourly-2024-11-21T03", // 深夜帯
        Start: Math.floor(now.getTime() / 1000) - 3600,
        End: Math.floor(now.getTime() / 1000),
        MessageCount: 0,
        UserCount: 0,
        CreatedAt: Math.floor(now.getTime() / 1000),
        ExpirationDate: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      };

      // Act
      await expect(
        messageRangeRepository.saveCounter(testData)
      ).resolves.not.toThrow();

      // Assert
      const result = await docClient.send(
        new GetCommand({
          TableName:
            process.env.COUNTER_RANGE_TABLE || "chat-sam-app-CounterRangeTable",
          Key: { RecordId: testData.RecordId },
        })
      );

      expect(result.Item).toBeDefined();
      expect(result.Item!.MessageCount).toBe(0);
      expect(result.Item!.UserCount).toBe(0);
    });
  });

  describe("統合テスト", () => {
    test("時系列データの保存と検証", async () => {
      // Arrange: 24時間分の時系列データ
      const baseTime = Math.floor(Date.now() / 1000);
      const hourlyData: MessageRangeItems[] = [];

      for (let i = 0; i < 24; i++) {
        const hour = baseTime - i * 3600; // i時間前
        hourlyData.push({
          RecordId: `hourly-2024-11-21T${23 - i}`.padEnd(19, ":00"),
          Start: hour - 3600,
          End: hour,
          MessageCount: Math.floor(Math.random() * 200) + 50, // 50-249件
          UserCount: Math.floor(Math.random() * 40) + 10, // 10-49人
          CreatedAt: hour,
          ExpirationDate: new Date((baseTime + 7 * 86400) * 1000), // 7日後
        });
      }

      // Act: 24時間分のデータを保存
      for (const data of hourlyData) {
        await messageRangeRepository.saveCounter(data);
      }

      // Assert: 全データが保存されていることを確認
      let totalMessages = 0;
      let totalUsers = 0;

      for (const expectedData of hourlyData) {
        const result = await docClient.send(
          new GetCommand({
            TableName:
              process.env.COUNTER_RANGE_TABLE ||
              "chat-sam-app-CounterRangeTable",
            Key: { RecordId: expectedData.RecordId },
          })
        );

        expect(result.Item).toBeDefined();
        expect(result.Item!.MessageCount).toBe(expectedData.MessageCount);
        expect(result.Item!.UserCount).toBe(expectedData.UserCount);

        totalMessages += expectedData.MessageCount;
        totalUsers += expectedData.UserCount;
      }

      // 統計的な検証
      expect(totalMessages).toBeGreaterThan(24 * 50); // 最小値での合計
      expect(totalUsers).toBeGreaterThan(24 * 10); // 最小値での合計
    });
  });
});
