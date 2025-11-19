import { getCounterHandler } from "../../../functions/chat-function/router/get-counter";
import { mockClient } from "aws-sdk-client-mock";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";
import {
  resetMockData,
  setupSpecificTableMocks,
  mockCounterRangeItems,
} from "./mock";

const ddbMock = mockClient(DynamoDBDocumentClient);

const tables: {
  messageTable?: boolean;
  sessionTable?: boolean;
  messageCounterTable?: boolean;
  counterRangeTable?: boolean;
} = {
  counterRangeTable: true,
  messageTable: true,
};
beforeAll(() => {
  setupSpecificTableMocks(ddbMock, tables);
});

afterEach(() => {
  ddbMock.reset();
  resetMockData();
});

describe("GetCounterHandler", () => {
  it("should return counter data with ranges and messages", async () => {
    // Arrange
    const mockHandlerArgs = {
      params: null,
      sessionId: "test-session",
      body: null,
      header: {},
    };

    // Act
    const result = await getCounterHandler(mockHandlerArgs);

    // Assert
    expect(result.statusCode).toBe(200);

    const responseBody = JSON.parse(result.body);
    expect(Array.isArray(responseBody)).toBe(true);

    // レスポンスの構造をチェック
    if (responseBody.length > 0) {
      const firstRange = responseBody[0];
      expect(firstRange).toHaveProperty("range");
      expect(firstRange).toHaveProperty("messages");

      // range オブジェクトの構造をチェック
      expect(firstRange.range).toHaveProperty("RecordId");
      expect(firstRange.range).toHaveProperty("Start");
      expect(firstRange.range).toHaveProperty("End");
      expect(firstRange.range).toHaveProperty("MessageCount");
      expect(firstRange.range).toHaveProperty("UserCount");
      expect(firstRange.range).toHaveProperty("CreatedAt");
      expect(firstRange.range).toHaveProperty("ExpirationDate");

      // messages 配列の構造をチェック
      expect(Array.isArray(firstRange.messages)).toBe(true);
    }
  });

  it("should return ranges with corresponding messages filtered by timestamp", async () => {
    // Arrange
    const mockHandlerArgs = {
      params: null,
      sessionId: "test-session",
      body: null,
      header: {},
    };

    // Act
    const result = await getCounterHandler(mockHandlerArgs);

    // Assert
    expect(result.statusCode).toBe(200);

    const responseBody = JSON.parse(result.body);

    // 各レンジに対してメッセージが適切にフィルタリングされているかチェック
    for (const rangeMessage of responseBody) {
      const { range, messages } = rangeMessage;

      // メッセージの CreatedAt が range.Start と range.End の間にあることを確認
      for (const message of messages) {
        expect(message.CreatedAt).toBeGreaterThanOrEqual(range.Start);
        expect(message.CreatedAt).toBeLessThanOrEqual(range.End);
      }
    }
  });

  it("should handle empty counter ranges", async () => {
    // Arrange - モックデータを空にする
    const originalData = [...mockCounterRangeItems];
    mockCounterRangeItems.splice(0, mockCounterRangeItems.length);

    const mockHandlerArgs = {
      params: null,
      sessionId: "test-session",
      body: null,
      header: {},
    };

    try {
      // Act
      const result = await getCounterHandler(mockHandlerArgs);

      // Assert
      expect(result.statusCode).toBe(200);
      const responseBody = JSON.parse(result.body);
      expect(responseBody).toEqual([]);
    } finally {
      // Cleanup - モックデータを復元
      mockCounterRangeItems.push(...originalData);
    }
  });

  it("should handle ranges with no matching messages", async () => {
    // Arrange - 未来の時間範囲のレンジを追加
    const futureRange = {
      RecordId: "range-future",
      Start: Math.floor((Date.now() + 24 * 60 * 60 * 1000) / 1000), // 24時間後
      End: Math.floor((Date.now() + 48 * 60 * 60 * 1000) / 1000), // 48時間後
      MessageCount: 0,
      UserCount: 0,
      CreatedAt: Math.floor(Date.now() / 1000),
      ExpirationDate: Math.floor(
        (Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000
      ),
    };

    // 一時的に未来のレンジを追加
    mockCounterRangeItems.push(futureRange);

    const mockHandlerArgs = {
      params: null,
      sessionId: "test-session",
      body: null,
      header: {},
    };

    try {
      // Act
      const result = await getCounterHandler(mockHandlerArgs);

      // Assert
      expect(result.statusCode).toBe(200);
      const responseBody = JSON.parse(result.body);

      // 未来のレンジに対応するエントリを探す
      const futureRangeResult = responseBody.find(
        (rm: any) => rm.range.RecordId === "range-future"
      );

      expect(futureRangeResult).toBeDefined();
      expect(futureRangeResult.messages).toEqual([]);
    } finally {
      // Cleanup - 追加したレンジを削除
      const index = mockCounterRangeItems.findIndex(
        (item: any) => item.RecordId === "range-future"
      );
      if (index >= 0) {
        mockCounterRangeItems.splice(index, 1);
      }
    }
  });

  it("should return valid JSON response format", async () => {
    // Arrange
    const mockHandlerArgs = {
      params: null,
      sessionId: "test-session",
      body: null,
      header: {},
    };

    // Act
    const result = await getCounterHandler(mockHandlerArgs);

    // Assert
    expect(result).toHaveProperty("statusCode");
    expect(result).toHaveProperty("body");
    expect(typeof result.body).toBe("string");

    // JSONパースが成功することを確認
    expect(() => JSON.parse(result.body)).not.toThrow();
  });
});
