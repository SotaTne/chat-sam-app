import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { MessageRepository } from "../../../functions/chat-function/repository/message";
import { MessageCounterRepository } from "../../../functions/chat-function/repository/message-counter";
import {
  setupIntegrationTest,
  teardownIntegrationTest,
  createDocumentClient,
  resetTestData,
} from "../shared/setup";

describe("MessageRepository Integration Tests", () => {
  let dynamoClient: DynamoDBClient;
  let docClient: DynamoDBDocumentClient;
  let messageRepository: MessageRepository;
  let counterRepository: MessageCounterRepository;
  const messageTableName = "chat-sam-app-MessageTable";

  beforeAll(async () => {
    dynamoClient = await setupIntegrationTest();
    docClient = createDocumentClient();
    messageRepository = new MessageRepository(docClient);
    counterRepository = new MessageCounterRepository(docClient);
  }, 30000);

  beforeEach(async () => {
    // 各テスト前にデータをリセット
    await resetTestData(dynamoClient);
  });

  afterAll(async () => {
    if (dynamoClient) {
      await teardownIntegrationTest(dynamoClient);
    }
  });

  describe("putMessage", () => {
    test("メッセージを正しく登録できること", async () => {
      // Arrange
      const messageNo = await counterRepository.nextMessageNo();
      const messageData = {
        UserId: "test-user-001",
        Content: "Test message content",
      };

      // Act
      await messageRepository.putMessage(messageData, messageNo);

      // Assert: getMessagesByPageで確認
      const messages = await messageRepository.getMessagesByPage(
        1,
        10,
        messageNo
      );
      expect(messages).toHaveLength(1);

      const savedMessage = messages[0];
      expect(savedMessage.MessageNo).toBe(messageNo);
      expect(savedMessage.UserId).toBe(messageData.UserId);
      expect(savedMessage.Content).toBe(messageData.Content);
      expect(savedMessage.Dummy).toBe("ALL");
      expect(typeof savedMessage.CreatedAt).toBe("number");
    });

    test("複数のメッセージを連続で登録できること", async () => {
      // Arrange & Act
      const testMessages = [
        { UserId: "user1", Content: "First message" },
        { UserId: "user2", Content: "Second message" },
        { UserId: "user1", Content: "Third message" },
      ];

      const messageNos = [];
      for (const msg of testMessages) {
        const messageNo = await counterRepository.nextMessageNo();
        await messageRepository.putMessage(msg, messageNo);
        messageNos.push(messageNo);
      }

      // Assert
      const messages = await messageRepository.getMessagesByPage(
        1,
        10,
        Math.max(...messageNos)
      );
      expect(messages).toHaveLength(3);

      // 降順でソートされていることを確認
      expect(messages[0].MessageNo).toBe(3);
      expect(messages[1].MessageNo).toBe(2);
      expect(messages[2].MessageNo).toBe(1);
    });
  });

  describe("getMessagesByPage", () => {
    beforeEach(async () => {
      // テストデータ準備：5件のメッセージを登録
      for (let i = 1; i <= 5; i++) {
        const messageNo = await counterRepository.nextMessageNo();
        await messageRepository.putMessage(
          {
            UserId: `user${i}`,
            Content: `Message ${i}`,
          },
          messageNo
        );
      }
    });

    test("ページング機能が正しく動作すること", async () => {
      // Act & Assert
      // Page 1: MessageNo 5,4,3 (降順)
      const page1 = await messageRepository.getMessagesByPage(1, 3, 5);
      expect(page1).toHaveLength(3);
      expect(page1.map((m) => m.MessageNo)).toEqual([5, 4, 3]);

      // Page 2: MessageNo 2,1
      const page2 = await messageRepository.getMessagesByPage(2, 3, 5);
      expect(page2).toHaveLength(2);
      expect(page2.map((m) => m.MessageNo)).toEqual([2, 1]);
    });

    test("範囲外のページは空配列を返すこと", async () => {
      const result = await messageRepository.getMessagesByPage(3, 3, 5);
      expect(result).toEqual([]);
    });

    test("異常なパラメータでエラーを投げること", async () => {
      await expect(
        messageRepository.getMessagesByPage(0, 5, 10)
      ).rejects.toThrow("page must be >= 1");
      await expect(
        messageRepository.getMessagesByPage(1, 0, 10)
      ).rejects.toThrow("perPage must be >= 1");
      await expect(
        messageRepository.getMessagesByPage(1, 5, -1)
      ).rejects.toThrow("max must be >= 0");
    });
  });

  describe("getMessagesFromLast", () => {
    beforeEach(async () => {
      // テストデータ準備：5件のメッセージを登録
      for (let i = 1; i <= 5; i++) {
        const messageNo = await counterRepository.nextMessageNo();
        await messageRepository.putMessage(
          {
            UserId: `user${i}`,
            Content: `Message ${i}`,
          },
          messageNo
        );
      }
    });

    test("指定したlastNumber以降のメッセージを取得できること", async () => {
      // Act: MessageNo 2以降を取得
      const result = await messageRepository.getMessagesFromLast(2, 5);

      // Assert
      expect(result.data).toHaveLength(3);
      expect(result.data.map((m) => m.MessageNo)).toEqual([3, 4, 5]); // 昇順
      expect(result.isGetAll).toBe(true);
    });

    test("lastがmax以上の場合は空配列とisGetAll=trueを返すこと", async () => {
      const result = await messageRepository.getMessagesFromLast(10, 5);

      expect(result.data).toEqual([]);
      expect(result.isGetAll).toBe(true);
    });

    test("limitが適用されることを確認", async () => {
      const result = await messageRepository.getMessagesFromLast(0, 5, 3);

      expect(result.data).toHaveLength(3);
      expect(result.data.map((m) => m.MessageNo)).toEqual([1, 2, 3]);
      expect(result.isGetAll).toBe(false); // limitで制限されているため
    });

    test("異常なパラメータでエラーを投げること", async () => {
      // last < 0
      await expect(
        messageRepository.getMessagesFromLast(-1, 5)
      ).rejects.toThrow("last must be >= 0");

      // max < 0 (修正後はパラメータ検証が先に実行される)
      await expect(
        messageRepository.getMessagesFromLast(0, -1)
      ).rejects.toThrow("max must be >= 0");

      // limit < 1
      await expect(
        messageRepository.getMessagesFromLast(0, 5, 0)
      ).rejects.toThrow("limit must be >= 1");
    });
  });

  describe("getMessagesFromTimeStampRange", () => {
    test("指定した時間範囲のメッセージを取得できること", async () => {
      // Arrange: 明確に異なる時刻でメッセージを登録
      const baseTime = Math.floor(Date.now() / 1000);
      const messages = [
        { time: baseTime, content: "Message 1" },
        { time: baseTime + 10, content: "Message 2" }, // 10秒後
        { time: baseTime + 20, content: "Message 3" }, // 20秒後
      ];

      for (let i = 0; i < messages.length; i++) {
        const messageNo = await counterRepository.nextMessageNo();
        // CreatedAtを直接設定するため、putCommandを直接実行
        const { PutCommand } = await import("@aws-sdk/lib-dynamodb");
        await docClient.send(
          new PutCommand({
            TableName: messageTableName,
            Item: {
              MessageNo: messageNo,
              UserId: `user${i + 1}`,
              Content: messages[i].content,
              CreatedAt: messages[i].time,
              Dummy: "ALL",
            },
          })
        );
      }

      // Act: baseTime から baseTime + 15 の範囲（最初の2件のみ含む）
      const result = await messageRepository.getMessagesFromTimeStampRange(
        baseTime,
        baseTime + 15
      );

      // Assert: 最初の2件が取得される
      expect(result).toHaveLength(2);
      expect(result.map((m) => m.Content)).toEqual(["Message 1", "Message 2"]);
    });

    test("範囲外の場合は空配列を返すこと", async () => {
      const futureTimestamp = Math.floor(Date.now() / 1000) + 1000;
      const result = await messageRepository.getMessagesFromTimeStampRange(
        futureTimestamp,
        futureTimestamp + 10
      );

      expect(result).toEqual([]);
    });

    test("不正な時間範囲でエラーを投げること", async () => {
      await expect(
        messageRepository.getMessagesFromTimeStampRange(100, 50)
      ).rejects.toThrow("startTimestamp must be <= endTimestamp");
    });
  });

  describe("統合テスト", () => {
    test("メッセージ登録からページング取得まで一連の流れが正常に動作すること", async () => {
      // Arrange & Act: 複数メッセージ登録
      const testMessages = Array.from({ length: 7 }, (_, i) => ({
        UserId: `user${i + 1}`,
        Content: `Integration test message ${i + 1}`,
      }));

      for (const msg of testMessages) {
        const messageNo = await counterRepository.nextMessageNo();
        await messageRepository.putMessage(msg, messageNo);
      }

      // Assert: ページング取得確認
      const currentCounter = await counterRepository.getCurrent();
      expect(currentCounter).toBe(7);

      const page1 = await messageRepository.getMessagesByPage(
        1,
        5,
        currentCounter
      );
      expect(page1).toHaveLength(5);
      expect(page1.map((m) => m.MessageNo)).toEqual([7, 6, 5, 4, 3]);

      const page2 = await messageRepository.getMessagesByPage(
        2,
        5,
        currentCounter
      );
      expect(page2).toHaveLength(2);
      expect(page2.map((m) => m.MessageNo)).toEqual([2, 1]);

      // lastから取得確認
      const fromLast = await messageRepository.getMessagesFromLast(
        5,
        currentCounter
      );
      expect(fromLast.data).toHaveLength(2);
      expect(fromLast.data.map((m) => m.MessageNo)).toEqual([6, 7]);
      expect(fromLast.isGetAll).toBe(true);
    });
  });
});
