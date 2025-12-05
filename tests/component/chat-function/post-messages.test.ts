import { mockClient } from "aws-sdk-client-mock";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

import {
  resetMockData,
  setupSpecificTableMocks,
  mockMessageItems,
  mockMessageCounterItems,
  initialMockMessageItems,
  initialMockMessageCounterItems,
} from "./mock";

import { postMessageHandler } from "../../../functions/chat-function/router/post-messages";

const ddbMock = mockClient(DynamoDBDocumentClient);

const tables: {
  messageTable?: boolean;
  sessionTable?: boolean;
  messageCounterTable?: boolean;
  counterRangeTable?: boolean;
} = {
  messageTable: true,
  messageCounterTable: true,
};

beforeAll(() => {
  setupSpecificTableMocks(ddbMock, tables);
});

afterEach(() => {
  resetMockData();
});

describe("PostMessageHandler", () => {
  it("有効なメッセージを正常に投稿し、mock配列に追加されることを確認", async () => {
    // Arrange
    const mockHandlerArgs = {
      params: null,
      sessionId: "test-user-123",
      body: { contents: "これはテストメッセージです。" },
      header: {},
    };

    // 実行前の配列スナップショット（実配列のコピー）
    const beforeMessages = mockMessageItems.map((x) => ({ ...x }));
    const beforeMessageCounters = mockMessageCounterItems.map((x) => ({
      ...x,
    }));

    const originalMessageCount = mockMessageItems.length;
    const originalCounterCount = mockMessageCounterItems.length;

    // Act
    const result = await postMessageHandler(mockHandlerArgs);

    // Assert
    expect(result.statusCode).toBe(200);

    const responseBody = JSON.parse(result.body);
    expect(responseBody).toHaveProperty("message");
    expect(responseBody.message).toBe("Message posted successfully");

    // ★ chat-sam-app-MessageTableに新しいメッセージが追加されていることを確認（データ整合性チェック）
    expect(mockMessageItems.length).toBe(originalMessageCount + 1);

    // 追加されたメッセージを検索
    const newMessage = mockMessageItems[mockMessageItems.length - 1];
    expect(newMessage.UserId).toBe("test-user-123");
    expect(newMessage.Content).toBe("これはテストメッセージです。");
    expect(newMessage.Dummy).toBe("ALL");
    expect(typeof newMessage.MessageNo).toBe("number");
    expect(typeof newMessage.CreatedAt).toBe("number");

    // MessageNoが既存の最大値（4）より大きいことを確認
    const existingMessageNos = beforeMessages.map((m) => m.MessageNo);
    const maxExistingMessageNo = Math.max(...existingMessageNos);
    expect(newMessage.MessageNo).toBeGreaterThan(maxExistingMessageNo);
    expect(newMessage.MessageNo).toBe(maxExistingMessageNo + 1); // 連番生成を確認

    // ★ chat-sam-app-MessageCounterTableが適切に更新されていることを確認
    const messageCounter = mockMessageCounterItems.find(
      (counter) => counter.CounterId === "MESSAGE_COUNTER"
    );
    expect(messageCounter).toBeDefined();
    expect(messageCounter!.Count).toBe(newMessage.MessageNo); // CounterとMessageNoの同期確認

    // ★ ビジネスロジック検証：MessageCounter.Countが増加していることを確認
    const beforeCounter = beforeMessageCounters.find(
      (counter) => counter.CounterId === "MESSAGE_COUNTER"
    );
    expect(messageCounter!.Count).toBe((beforeCounter?.Count || 0) + 1);

    // 元の配列（追加前）との比較で、新規追加分のみが差分であることを確認
    const messagesWithoutNew = mockMessageItems.slice(0, -1);
    expect(messagesWithoutNew).toEqual(beforeMessages);
  });

  it("bodyが存在しない場合は400エラーを返し、テーブルを変更しないこと", async () => {
    // Arrange
    const mockHandlerArgs = {
      params: null,
      sessionId: "test-user-123",
      body: null,
      header: {},
    };

    // 実行前の配列スナップショット
    const beforeMessages = mockMessageItems.map((x) => ({ ...x }));
    const beforeMessageCounters = mockMessageCounterItems.map((x) => ({
      ...x,
    }));

    // Act
    const result = await postMessageHandler(mockHandlerArgs);

    // Assert
    expect(result.statusCode).toBe(400);
    expect(result.body).toContain("body is required");

    // ★ DynamoDBのモック配列が一切変化していないことを確認
    expect(mockMessageItems).toEqual(beforeMessages);
    expect(mockMessageCounterItems).toEqual(beforeMessageCounters);

    // 初期状態と同じであることも確認
    expect(mockMessageItems).toEqual(initialMockMessageItems);
    expect(mockMessageCounterItems).toEqual(initialMockMessageCounterItems);
  });

  it("bodyがオブジェクトでない場合は400エラーを返し、テーブルを変更しないこと", async () => {
    // Arrange
    const mockHandlerArgs = {
      params: null,
      sessionId: "test-user-123",
      body: "invalid string body",
      header: {},
    };

    // 実行前の配列スナップショット
    const beforeMessages = mockMessageItems.map((x) => ({ ...x }));
    const beforeMessageCounters = mockMessageCounterItems.map((x) => ({
      ...x,
    }));

    // Act
    const result = await postMessageHandler(mockHandlerArgs);

    // Assert
    expect(result.statusCode).toBe(400);
    expect(result.body).toContain("body must be an object");

    // ★ DynamoDBのモック配列が変化していないことを確認
    expect(mockMessageItems).toEqual(beforeMessages);
    expect(mockMessageCounterItems).toEqual(beforeMessageCounters);
  });

  it("contentsが存在しない場合は400エラーを返し、テーブルを変更しないこと", async () => {
    // Arrange
    const mockHandlerArgs = {
      params: null,
      sessionId: "test-user-123",
      body: { someOtherField: "value" },
      header: {},
    };

    // 実行前の配列スナップショット
    const beforeMessages = mockMessageItems.map((x) => ({ ...x }));
    const beforeMessageCounters = mockMessageCounterItems.map((x) => ({
      ...x,
    }));

    // Act
    const result = await postMessageHandler(mockHandlerArgs);

    // Assert
    expect(result.statusCode).toBe(400);
    expect(result.body).toContain("contents is required");

    // ★ DynamoDBのモック配列が変化していないことを確認
    expect(mockMessageItems).toEqual(beforeMessages);
    expect(mockMessageCounterItems).toEqual(beforeMessageCounters);
  });

  it("contentsが空文字の場合は400エラーを返し、テーブルを変更しないこと", async () => {
    // Arrange
    const mockHandlerArgs = {
      params: null,
      sessionId: "test-user-123",
      body: { contents: "" },
      header: {},
    };

    // 実行前の配列スナップショット
    const beforeMessages = mockMessageItems.map((x) => ({ ...x }));
    const beforeMessageCounters = mockMessageCounterItems.map((x) => ({
      ...x,
    }));

    // Act
    const result = await postMessageHandler(mockHandlerArgs);

    // Assert
    expect(result.statusCode).toBe(400);
    expect(result.body).toContain("contents is required");

    // ★ DynamoDBのモック配列が変化していないことを確認
    expect(mockMessageItems).toEqual(beforeMessages);
    expect(mockMessageCounterItems).toEqual(beforeMessageCounters);
  });

  it("contentsが2048文字を超える場合は400エラーを返し、テーブルを変更しないこと", async () => {
    // Arrange
    const longContent = "a".repeat(2049); // 2049文字
    const mockHandlerArgs = {
      params: null,
      sessionId: "test-user-123",
      body: { contents: longContent },
      header: {},
    };

    // 実行前の配列スナップショット
    const beforeMessages = mockMessageItems.map((x) => ({ ...x }));
    const beforeMessageCounters = mockMessageCounterItems.map((x) => ({
      ...x,
    }));

    // Act
    const result = await postMessageHandler(mockHandlerArgs);

    // Assert
    expect(result.statusCode).toBe(400);
    expect(result.body).toContain(
      "contents is required and must be a string <= 2048 characters"
    );

    // ★ DynamoDBのモック配列が変化していないことを確認
    expect(mockMessageItems).toEqual(beforeMessages);
    expect(mockMessageCounterItems).toEqual(beforeMessageCounters);
  });

  it("複数のメッセージを連続投稿した場合の整合性チェック", async () => {
    // Arrange
    const message1Args = {
      params: null,
      sessionId: "user-1",
      body: { contents: "1つ目のメッセージ" },
      header: {},
    };
    const message2Args = {
      params: null,
      sessionId: "user-2",
      body: { contents: "2つ目のメッセージ" },
      header: {},
    };

    // 実行前の配列スナップショット
    const beforeMessages = mockMessageItems.map((x) => ({ ...x }));
    const originalMessageCount = mockMessageItems.length;

    // Act
    const result1 = await postMessageHandler(message1Args);
    const result2 = await postMessageHandler(message2Args);

    // Assert
    expect(result1.statusCode).toBe(200);
    expect(result2.statusCode).toBe(200);

    // ★ 2つのメッセージが追加されていることを確認
    expect(mockMessageItems.length).toBe(originalMessageCount + 2);

    // 追加されたメッセージの内容確認
    const addedMessages = mockMessageItems.slice(-2);
    expect(addedMessages[0].Content).toBe("1つ目のメッセージ");
    expect(addedMessages[0].UserId).toBe("user-1");
    expect(addedMessages[1].Content).toBe("2つ目のメッセージ");
    expect(addedMessages[1].UserId).toBe("user-2");

    // ★ MessageNo が適切にインクリメントされていることを確認
    expect(addedMessages[1].MessageNo).toBeGreaterThan(
      addedMessages[0].MessageNo
    );

    // 元の配列（追加前）部分は変化していないことを確認
    const messagesWithoutNew = mockMessageItems.slice(0, originalMessageCount);
    expect(messagesWithoutNew).toEqual(beforeMessages);

    // ★ 追加したデータがmock配列内に正確に存在することを確認
    const message1InMock = mockMessageItems.find(
      (msg) => msg.Content === "1つ目のメッセージ" && msg.UserId === "user-1"
    );
    const message2InMock = mockMessageItems.find(
      (msg) => msg.Content === "2つ目のメッセージ" && msg.UserId === "user-2"
    );
    expect(message1InMock).toBeDefined();
    expect(message2InMock).toBeDefined();
  });
});
