import { mockClient } from "aws-sdk-client-mock";
import {
  DynamoDBDocumentClient,
} from "../../../functions/chat-function/node_modules/@aws-sdk/lib-dynamodb";

import {
  resetMockData,
  setupSpecificTableMocks,
  mockMessageItems,
  mockMessageCounterItems,
  initialMockMessageItems,
  initialMockMessageCounterItems,
} from "./mock";

import { getMessagesLastHandler } from "../../../functions/chat-function/router/get-messages-last";

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

describe("GetMessagesLastHandler", () => {
  it("最後のメッセージ番号から指定件数のメッセージを取得し、テーブルの内容を変更しないこと", async () => {
    // Arrange
    const mockHandlerArgs = {
      params: { lastNumber: "10" }, // 現在のmax(4)より大きい = ahead状態
      sessionId: "test-session",
      body: null,
      header: {},
    };

    // 実行前の配列スナップショット（実配列のコピー）
    const beforeMessages = mockMessageItems.map((x) => ({ ...x }));
    const beforeMessageCounters = mockMessageCounterItems.map((x) => ({ ...x }));

    // Act
    const result = await getMessagesLastHandler(mockHandlerArgs);

    // Assert
    expect(result.statusCode).toBe(200);

    const responseBody = JSON.parse(result.body);
    expect(responseBody).toHaveProperty("data");
    expect(responseBody).toHaveProperty("isGetAll");
    expect(Array.isArray(responseBody.data)).toBe(true);
    expect(typeof responseBody.isGetAll).toBe("boolean");
    
    // lastNumber(10) >= max(4) の場合の実動作を検証
    expect(responseBody.data).toHaveLength(0); // 新しいメッセージなし
    expect(responseBody.isGetAll).toBe(true); // 全て取得済み状態
    
    // ★ 実際のビジネスロジック検証：lastNumber > 最大MessageNo の場合の動作
    const maxMessageNo = Math.max(...mockMessageItems.map(msg => msg.MessageNo));
    expect(maxMessageNo).toBe(4); // モックデータの最大MessageNo確認
    expect(parseInt(mockHandlerArgs.params.lastNumber)).toBeGreaterThan(maxMessageNo);
    
    // ★ ahead状態（lastNumber > maxMessageNo）で空配列とisGetAll=trueが正しく返される

    // ★ DynamoDBのモック配列が一切変化していないことを確認（データ整合性チェック）
    expect(mockMessageItems).toEqual(beforeMessages);
    expect(mockMessageCounterItems).toEqual(beforeMessageCounters);

    // 初期状態と同じであることも保証
    expect(mockMessageItems).toEqual(initialMockMessageItems);
    expect(mockMessageCounterItems).toEqual(initialMockMessageCounterItems);
  });

  it("パラメータが無効な場合は400エラーを返し、テーブルの内容を変更しないこと", async () => {
    // Arrange
    const mockHandlerArgs = {
      params: null,
      sessionId: "test-session",
      body: null,
      header: {},
    };

    // 実行前の配列スナップショット
    const beforeMessages = mockMessageItems.map((x) => ({ ...x }));
    const beforeMessageCounters = mockMessageCounterItems.map((x) => ({ ...x }));

    // Act
    const result = await getMessagesLastHandler(mockHandlerArgs);

    // Assert
    expect(result.statusCode).toBe(400);

    const responseBody = JSON.parse(result.body);
    expect(responseBody).toHaveProperty("message");
    expect(responseBody.message).toContain("lastNumber is required");

    // ★ DynamoDBのモック配列が変化していないことを確認
    expect(mockMessageItems).toEqual(beforeMessages);
    expect(mockMessageCounterItems).toEqual(beforeMessageCounters);
  });

  it("lastNumberが数値以外の場合は400エラーを返し、テーブルの内容を変更しないこと", async () => {
    // Arrange
    const mockHandlerArgs = {
      params: { lastNumber: "invalid" },
      sessionId: "test-session",
      body: null,
      header: {},
    };

    // 実行前の配列スナップショット
    const beforeMessages = mockMessageItems.map((x) => ({ ...x }));
    const beforeMessageCounters = mockMessageCounterItems.map((x) => ({ ...x }));

    // Act
    const result = await getMessagesLastHandler(mockHandlerArgs);

    // Assert
    expect(result.statusCode).toBe(400);

    const responseBody = JSON.parse(result.body);
    expect(responseBody).toHaveProperty("message");
    expect(responseBody.message).toContain("lastNumber must be a number");

    // ★ DynamoDBのモック配列が変化していないことを確認
    expect(mockMessageItems).toEqual(beforeMessages);
    expect(mockMessageCounterItems).toEqual(beforeMessageCounters);
  });

  it("部分的なフェッチが正しく動作すること（lastNumber < maxの場合）", async () => {
    // Arrange
    const mockHandlerArgs = {
      params: { lastNumber: "2" }, // max(4)より小さい = 部分取得
      sessionId: "test-session",
      body: null,
      header: {},
    };

    // 実行前の配列スナップショット
    const beforeMessages = mockMessageItems.map((x) => ({ ...x }));
    const beforeMessageCounters = mockMessageCounterItems.map((x) => ({ ...x }));

    // Act
    const result = await getMessagesLastHandler(mockHandlerArgs);

    // Assert
    expect(result.statusCode).toBe(200);

    const responseBody = JSON.parse(result.body);
    expect(responseBody).toHaveProperty("data");
    expect(responseBody).toHaveProperty("isGetAll");
    
    // lastNumber(2) より大きいMessageNo（=3,4）が取得される
    expect(responseBody.data).toHaveLength(2);
    const messageNos = responseBody.data.map((msg: any) => msg.MessageNo).sort();
    expect(messageNos).toEqual([3, 4]);
    
    // 部分取得なのでisGetAllはtrue（全て取得した）
    expect(responseBody.isGetAll).toBe(true);

    // データ整合性チェック
    expect(mockMessageItems).toEqual(beforeMessages);
    expect(mockMessageCounterItems).toEqual(beforeMessageCounters);
  });

  it("メッセージが存在しない場合は空配列を返し、テーブルの状態が変更されないこと", async () => {
    // Arrange
    const mockHandlerArgs = {
      params: { lastNumber: "1" },
      sessionId: "test-session",
      body: null,
      header: {},
    };

    // メッセージテーブルを一時的に空にする
    const originalMessages = [...mockMessageItems];
    mockMessageItems.splice(0, mockMessageItems.length);

    // 実行前の配列スナップショット（空配列）
    const beforeMessages = mockMessageItems.map((x) => ({ ...x }));
    const beforeMessageCounters = mockMessageCounterItems.map((x) => ({ ...x }));

    // Act
    const result = await getMessagesLastHandler(mockHandlerArgs);

    // Assert
    expect(result.statusCode).toBe(200);

    const responseBody = JSON.parse(result.body);
    expect(responseBody).toHaveProperty("data");
    expect(responseBody).toHaveProperty("isGetAll");
    expect(Array.isArray(responseBody.data)).toBe(true);
    expect(responseBody.data).toHaveLength(0);
    expect(typeof responseBody.isGetAll).toBe("boolean");

    // ★ DynamoDBのモック配列が変化していないことを確認
    expect(mockMessageItems).toEqual(beforeMessages);
    expect(mockMessageCounterItems).toEqual(beforeMessageCounters);

    // テスト後に元のデータを復元
    mockMessageItems.splice(0, 0, ...originalMessages);
  });

  it("新しいメッセージが追加された場合に正しく取得され、テーブルを変更しないこと", async () => {
    // Arrange
    const mockHandlerArgs = {
      params: { lastNumber: "2" }, // MessageNo 2より後の新しいメッセージ（3,4）を取得予定
      sessionId: "test-session",
      body: null,
      header: {},
    };

    // 実行前の配列スナップショット
    const beforeMessages = mockMessageItems.map((x) => ({ ...x }));
    const beforeMessageCounters = mockMessageCounterItems.map((x) => ({ ...x }));

    // Act
    const result = await getMessagesLastHandler(mockHandlerArgs);

    // Assert
    expect(result.statusCode).toBe(200);

    const responseBody = JSON.parse(result.body);
    expect(responseBody).toHaveProperty("data");
    expect(Array.isArray(responseBody.data)).toBe(true);
    
    // ★ 実際のビジネスロジック検証：lastNumber=2より新しいメッセージ（MessageNo 3,4）が取得される
    expect(responseBody.data).toHaveLength(2); // MessageNo 3,4の2件
    
    const messageNos = responseBody.data.map((msg: any) => msg.MessageNo).sort((a: number, b: number) => a - b);
    expect(messageNos).toEqual([3, 4]); // lastNumber(2)より大きいMessageNoのみ
    
    // ★ 各メッセージの内容検証（実際のモックデータとの整合性）
    const msg3 = responseBody.data.find((msg: any) => msg.MessageNo === 3);
    const msg4 = responseBody.data.find((msg: any) => msg.MessageNo === 4);
    
    expect(msg3).toBeDefined();
    expect(msg4).toBeDefined();
    expect(msg3.UserId).toBe("user123"); // モックデータの実際の値
    expect(msg4.UserId).toBe("user789"); // モックデータの実際の値
    
    // ★ isGetAllフラグの正確性検証：lastNumber=2で最新まで取得したのでtrue
    expect(responseBody.isGetAll).toBe(true);
    
    // ★ lastNumber=2より小さいMessageNo（1,2）は含まれないことを確認
    const shouldNotInclude = responseBody.data.filter((msg: any) => msg.MessageNo <= 2);
    expect(shouldNotInclude).toHaveLength(0);

    // ★ DynamoDBのモック配列が変化していないことを確認（データ整合性チェック）
    expect(mockMessageItems).toEqual(beforeMessages);
    expect(mockMessageCounterItems).toEqual(beforeMessageCounters);
  });
});
