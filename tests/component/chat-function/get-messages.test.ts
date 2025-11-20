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

import { getMessagesHandler } from "../../../functions/chat-function/router/get-messages";

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

describe("GetMessagesHandler", () => {
  it("デフォルトページング（page=1, perPage=20）でメッセージを取得し、テーブルの内容を変更しないこと", async () => {
    // Arrange
    const mockHandlerArgs = {
      params: null,
      sessionId: "test-session",
      body: null,
      header: {},
    };

    // 実行前の配列スナップショット（実配列のコピー）
    const beforeMessages = mockMessageItems.map((x) => ({ ...x }));
    const beforeMessageCounters = mockMessageCounterItems.map((x) => ({ ...x }));

    // Act
    const result = await getMessagesHandler(mockHandlerArgs);

    // Assert
    expect(result.statusCode).toBe(200);

    const responseBody = JSON.parse(result.body);
    expect(Array.isArray(responseBody)).toBe(true);
    
    // デフォルトページング（page=1, perPage=20）で全メッセージが取得されることを検証
    expect(responseBody.length).toBe(4); // 既存の4つのメッセージ全てが取得される
    
    // 降順ソート（ScanIndexForward: false）なので MessageNo [4,3,2,1] の順
    const messageNos = responseBody.map((msg: any) => msg.MessageNo);
    expect(messageNos).toEqual([4, 3, 2, 1]);

    // レスポンス構造をチェック
    if (responseBody.length > 0) {
      const firstMessage = responseBody[0];
      expect(firstMessage).toHaveProperty("MessageNo");
      expect(typeof firstMessage.MessageNo).toBe("number");
      expect(firstMessage).toHaveProperty("UserId");
      expect(typeof firstMessage.UserId).toBe("string");
      expect(firstMessage).toHaveProperty("Content");
      expect(typeof firstMessage.Content).toBe("string");
      expect(firstMessage).toHaveProperty("CreatedAt");
      expect(typeof firstMessage.CreatedAt).toBe("number");
    }

    // ★ DynamoDBのモック配列が一切変化していないことを確認（データ整合性チェック）
    expect(mockMessageItems).toEqual(beforeMessages);
    expect(mockMessageCounterItems).toEqual(beforeMessageCounters);

    // 初期状態と同じであることも保証
    expect(mockMessageItems).toEqual(initialMockMessageItems);
    expect(mockMessageCounterItems).toEqual(initialMockMessageCounterItems);
  });

  it("カスタムページング（page=2, perPage=5）でメッセージを取得し、テーブルの内容を変更しないこと", async () => {
    // Arrange
    const mockHandlerArgs = {
      params: { page: "2", perPage: "5" },
      sessionId: "test-session",
      body: null,
      header: {},
    };

    // 実行前の配列スナップショット
    const beforeMessages = mockMessageItems.map((x) => ({ ...x }));
    const beforeMessageCounters = mockMessageCounterItems.map((x) => ({ ...x }));

    // Act
    const result = await getMessagesHandler(mockHandlerArgs);

    // Assert
    expect(result.statusCode).toBe(200);

    const responseBody = JSON.parse(result.body);
    expect(Array.isArray(responseBody)).toBe(true);

    // ページング動作を実際に検証: page=2, perPage=5 の場合
    // 既存のメッセージ数(4)で、降順ソート想定なら:
    // page=1, perPage=5: MessageNo [4,3,2,1] (全て取得)  
    // page=2, perPage=5: 空配列 (2ページ目は存在しない)
    expect(responseBody.length).toBe(0); // 2ページ目なので空配列が期待値
    
    // MessageCounterの値(4)とページング計算に基づく動作の検証
    // max=4, page=2, perPage=5 → (page-1)*perPage+1 = 6 > max なので取得範囲外

    // ★ DynamoDBのモック配列が変化していないことを確認
    expect(mockMessageItems).toEqual(beforeMessages);
    expect(mockMessageCounterItems).toEqual(beforeMessageCounters);
  });

  it("メッセージが存在しない場合は空配列を返し、テーブルの状態が変更されないこと", async () => {
    // Arrange
    const mockHandlerArgs = {
      params: { page: "1", perPage: "10" },
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
    const result = await getMessagesHandler(mockHandlerArgs);

    // Assert
    expect(result.statusCode).toBe(200);

    const responseBody = JSON.parse(result.body);
    expect(Array.isArray(responseBody)).toBe(true);
    expect(responseBody).toHaveLength(0);

    // ★ DynamoDBのモック配列が変化していないことを確認
    expect(mockMessageItems).toEqual(beforeMessages);
    expect(mockMessageCounterItems).toEqual(beforeMessageCounters);

    // テスト後に元のデータを復元
    mockMessageItems.splice(0, 0, ...originalMessages);
  });

  it("レスポンス形式が正しいJSON構造であり、テーブルを変更しないこと", async () => {
    // Arrange
    const mockHandlerArgs = {
      params: { page: "1", perPage: "3" },
      sessionId: "test-session",
      body: null,
      header: {},
    };

    // 実行前の配列スナップショット
    const beforeMessages = mockMessageItems.map((x) => ({ ...x }));
    const beforeMessageCounters = mockMessageCounterItems.map((x) => ({ ...x }));

    // Act
    const result = await getMessagesHandler(mockHandlerArgs);

    // Assert
    expect(result.statusCode).toBe(200);
    expect(typeof result.body).toBe("string");

    // JSON パースができることを確認
    let parsedBody: any;
    expect(() => {
      parsedBody = JSON.parse(result.body);
    }).not.toThrow();

    // 配列応答の確認
    expect(Array.isArray(parsedBody)).toBe(true);

    // 各メッセージの構造確認
    parsedBody.forEach((message: any) => {
      expect(message).toHaveProperty("MessageNo");
      expect(message).toHaveProperty("UserId");
      expect(message).toHaveProperty("Content");
      expect(message).toHaveProperty("CreatedAt");
    });

    // ★ DynamoDBのモック配列が一切変化していないことを確認（データ整合性チェック）
    expect(mockMessageItems).toEqual(beforeMessages);
    expect(mockMessageCounterItems).toEqual(beforeMessageCounters);

    // 初期状態と同じであることも保証
    expect(mockMessageItems).toEqual(initialMockMessageItems);
    expect(mockMessageCounterItems).toEqual(initialMockMessageCounterItems);
  });

  it("新しいメッセージが追加された場合にページングで正しく取得され、テーブルを変更しないこと", async () => {
    // Arrange
    const mockHandlerArgs = {
      params: { page: "1", perPage: "10" },
      sessionId: "test-session",
      body: null,
      header: {},
    };

    // テスト用の追加メッセージを複数挿入
    const additionalMessages = [
      {
        MessageNo: 5, // 既存の最大MessageNo(4)の次
        UserId: "test-user-1",
        Content: "追加メッセージ1",
        CreatedAt: Math.floor(Date.now() / 1000) - 100,
        Dummy: "ALL",
      },
      {
        MessageNo: 6, // 既存の最大MessageNo(4)の次の次
        UserId: "test-user-2", 
        Content: "追加メッセージ2",
        CreatedAt: Math.floor(Date.now() / 1000) - 50,
        Dummy: "ALL",
      },
    ];

    mockMessageItems.push(...additionalMessages);

    // MessageCounterも追加メッセージを考慮して更新
    const messageCounterForUpdate = mockMessageCounterItems.find(
      (counter) => counter.CounterId === "MESSAGE_COUNTER"
    );
    if (messageCounterForUpdate) {
      messageCounterForUpdate.Count = 6; // 最新のMessageNoに合わせる
    }

    // 実行前の配列スナップショット（追加データを含む）
    const beforeMessages = mockMessageItems.map((x) => ({ ...x }));
    const beforeMessageCounters = mockMessageCounterItems.map((x) => ({ ...x }));

    // Act
    const result = await getMessagesHandler(mockHandlerArgs);

    // Assert
    expect(result.statusCode).toBe(200);

    const responseBody = JSON.parse(result.body);
    expect(Array.isArray(responseBody)).toBe(true);

    // 追加したメッセージが含まれていることを確認
    const messageNos = responseBody.map((msg: any) => msg.MessageNo);
    expect(messageNos).toContain(5);
    expect(messageNos).toContain(6);

    // 追加データが正しく反映されているかチェック
    const addedMessage1 = responseBody.find(
      (msg: any) => msg.MessageNo === 5
    );
    expect(addedMessage1).toBeDefined();
    expect(addedMessage1.Content).toBe("追加メッセージ1");

    // ★ DynamoDBのモック配列が変化していないことを確認（データ整合性チェック）
    expect(mockMessageItems).toEqual(beforeMessages);
    expect(mockMessageCounterItems).toEqual(beforeMessageCounters);

    // ★ 追加したデータがmock配列内に存在することを確認
    const addedMessagesInMock = mockMessageItems.filter(
      (msg) => msg.MessageNo === 5 || msg.MessageNo === 6
    );
    expect(addedMessagesInMock).toHaveLength(2);

    // テスト後に追加データを削除（クリーンアップ）
    additionalMessages.forEach(addedMsg => {
      const indexToRemove = mockMessageItems.findIndex(
        (msg) => msg.MessageNo === addedMsg.MessageNo
      );
      if (indexToRemove !== -1) {
        mockMessageItems.splice(indexToRemove, 1);
      }
    });

    // MessageCounterを元に戻す
    const messageCounterForCleanup = mockMessageCounterItems.find(
      (counter) => counter.CounterId === "MESSAGE_COUNTER"
    );
    if (messageCounterForCleanup) {
      messageCounterForCleanup.Count = 4; // 元の値に復元
    }
  });
});
