import { mockClient } from "aws-sdk-client-mock";
import {
  DynamoDBDocumentClient,
  ScanCommand,
} from "../../../functions/chat-function/node_modules/@aws-sdk/lib-dynamodb";

import {
  resetMockData,
  setupSpecificTableMocks,
  mockCounterRangeItems,
  initialMockCounterRangeItems,
} from "./mock";

import { getMessageCollector } from "../../../functions/chat-function/router/get-message-collector";

const ddbMock = mockClient(DynamoDBDocumentClient);

const tables: {
  messageTable?: boolean;
  sessionTable?: boolean;
  messageCounterTable?: boolean;
  counterRangeTable?: boolean;
} = {
  counterRangeTable: true, // get-collect-info で使用するテーブル
};

beforeAll(() => {
  setupSpecificTableMocks(ddbMock, tables);
});

afterEach(() => {
  resetMockData(); // ddbMock.reset() は呼ばない
});

describe("GetMessageCollectorHandler", () => {
  it("コレクター情報を正常に取得し、テーブルの内容を変更しないこと", async () => {
    // Arrange
    const mockHandlerArgs = {
      params: null,
      sessionId: "test-session",
      body: null,
      header: {},
    };

    // 実行前の配列スナップショット（実配列のコピー）
    const beforeCounterRanges = mockCounterRangeItems.map((x) => ({ ...x }));

    // Act
    const result = await getMessageCollector(mockHandlerArgs);

    // Assert
    expect(result.statusCode).toBe(200);

    const responseBody = JSON.parse(result.body);
    expect(responseBody).toHaveProperty("info");
    expect(Array.isArray(responseBody.info)).toBe(true);

    // レスポンス構造をチェック
    if (responseBody.info.length > 0) {
      const firstItem = responseBody.info[0];
      
      // CounterRangeテーブルの項目の構造をチェック
      expect(firstItem).toHaveProperty("RecordId");
      expect(typeof firstItem.RecordId).toBe("string");
      expect(firstItem).toHaveProperty("Start");
      expect(typeof firstItem.Start).toBe("number");
      expect(firstItem).toHaveProperty("End");
      expect(typeof firstItem.End).toBe("number");
      expect(firstItem).toHaveProperty("MessageCount");
      expect(typeof firstItem.MessageCount).toBe("number");
      expect(firstItem).toHaveProperty("UserCount");
      expect(typeof firstItem.UserCount).toBe("number");
    }

    // ★ DynamoDBのモック配列が一切変化していないことを確認（データ整合性チェック）
    expect(mockCounterRangeItems).toEqual(beforeCounterRanges);

    // ついでに「初期状態」と同じであることも保証しておく
    expect(mockCounterRangeItems).toEqual(initialMockCounterRangeItems);
  });

  it("空のカウンターレンジの場合は空配列を返し、テーブルの状態が変更されないこと", async () => {
    // Arrange
    const mockHandlerArgs = {
      params: null,
      sessionId: "test-session",
      body: null,
      header: {},
    };

    // カウンターレンジを一時的に空にする
    const originalRanges = [...mockCounterRangeItems];
    mockCounterRangeItems.splice(0, mockCounterRangeItems.length);

    // 実行前の配列スナップショット（空配列）
    const beforeCounterRanges = mockCounterRangeItems.map((x) => ({ ...x }));

    // Act
    const result = await getMessageCollector(mockHandlerArgs);

    // Assert
    expect(result.statusCode).toBe(200);

    const responseBody = JSON.parse(result.body);
    expect(responseBody).toHaveProperty("info");
    expect(Array.isArray(responseBody.info)).toBe(true);
    expect(responseBody.info).toHaveLength(0);

    // ★ DynamoDBのモック配列が変化していないことを確認（空のまま）
    expect(mockCounterRangeItems).toEqual(beforeCounterRanges);
    expect(mockCounterRangeItems).toHaveLength(0);

    // テスト後に元のデータを復元
    mockCounterRangeItems.splice(0, 0, ...originalRanges);
  });

  it("レスポンス形式が正しいJSON構造であり、テーブルを変更しないこと", async () => {
    // Arrange
    const mockHandlerArgs = {
      params: null,
      sessionId: "test-session",
      body: null,
      header: {},
    };

    // 実行前の配列スナップショット（実配列のコピー）
    const beforeCounterRanges = mockCounterRangeItems.map((x) => ({ ...x }));

    // Act
    const result = await getMessageCollector(mockHandlerArgs);

    // Assert
    expect(result.statusCode).toBe(200);
    expect(typeof result.body).toBe("string");

    // JSON パースができることを確認
    let parsedBody: any;
    expect(() => {
      parsedBody = JSON.parse(result.body);
    }).not.toThrow();

    // レスポンス構造の確認
    expect(parsedBody).toHaveProperty("info");
    expect(Array.isArray(parsedBody.info)).toBe(true);

    // 各アイテムがCounterRangeの構造に準拠していることを確認
    parsedBody.info.forEach((item: any) => {
      expect(item).toHaveProperty("RecordId");
      expect(item).toHaveProperty("Start");
      expect(item).toHaveProperty("End");
      expect(item).toHaveProperty("MessageCount");
      expect(item).toHaveProperty("UserCount");
    });

    // ★ DynamoDBのモック配列が一切変化していないことを確認（データ整合性チェック）
    expect(mockCounterRangeItems).toEqual(beforeCounterRanges);

    // 「初期状態」と同じであることも保証
    expect(mockCounterRangeItems).toEqual(initialMockCounterRangeItems);
  });

  it("複数のカウンターレンジが存在する場合に全件取得し、テーブルを変更しないこと", async () => {
    // Arrange
    const mockHandlerArgs = {
      params: null,
      sessionId: "test-session", 
      body: null,
      header: {},
    };

    // テスト用の追加データを一時的に挿入（データ追加のテストケース）
    const additionalRange = {
      RecordId: "test-additional-range",
      Start: Math.floor(Date.now() / 1000) - 7200, // 2時間前
      End: Math.floor(Date.now() / 1000) - 3600,   // 1時間前
      MessageCount: 10,
      UserCount: 3,
      CreatedAt: Math.floor(Date.now() / 1000) - 3600,
      ExpirationDate: Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000),
    };

    // データを追加
    mockCounterRangeItems.push(additionalRange);

    // 実行前の配列スナップショット（追加データを含む）
    const beforeCounterRanges = mockCounterRangeItems.map((x) => ({ ...x }));

    // Act
    const result = await getMessageCollector(mockHandlerArgs);

    // Assert
    expect(result.statusCode).toBe(200);

    const responseBody = JSON.parse(result.body);
    expect(responseBody).toHaveProperty("info");
    expect(Array.isArray(responseBody.info)).toBe(true);

    // 追加したレンジが含まれていることを確認
    const rangeIds = responseBody.info.map((item: any) => item.RecordId);
    expect(rangeIds).toContain("test-additional-range");

    // 追加データが正しく反映されているかチェック
    const addedRangeInResponse = responseBody.info.find(
      (item: any) => item.RecordId === "test-additional-range"
    );
    expect(addedRangeInResponse).toBeDefined();
    expect(addedRangeInResponse.MessageCount).toBe(10);
    expect(addedRangeInResponse.UserCount).toBe(3);
    // 時刻は動的に変わるので、大まかな範囲でチェック
    expect(addedRangeInResponse.Start).toBeGreaterThan(Math.floor(Date.now() / 1000) - 8000);
    expect(addedRangeInResponse.End).toBeGreaterThan(Math.floor(Date.now() / 1000) - 4000);

    // ★ DynamoDBのモック配列が変化していないことを確認（データ整合性チェック）
    expect(mockCounterRangeItems).toEqual(beforeCounterRanges);

    // ★ 追加したデータがmock配列内に存在することを確認
    const addedRangeInMock = mockCounterRangeItems.find(
      (item) => item.RecordId === "test-additional-range"
    );
    expect(addedRangeInMock).toEqual(additionalRange);

    // テスト後に追加データを削除（クリーンアップ）
    const indexToRemove = mockCounterRangeItems.findIndex(
      (item) => item.RecordId === "test-additional-range"
    );
    if (indexToRemove !== -1) {
      mockCounterRangeItems.splice(indexToRemove, 1);
    }
  });

  it("エラーハンドリング：UseCaseでエラーが発生した場合の動作確認とテーブル状態の確認", async () => {
    // Arrange
    const mockHandlerArgs = {
      params: null,
      sessionId: "test-session",
      body: null,
      header: {},
    };

    // 実行前の配列スナップショット
    const beforeCounterRanges = mockCounterRangeItems.map((x) => ({ ...x }));

    // DynamoDBのScanCommandにエラーを発生させる
    ddbMock.reset();
    ddbMock.on(ScanCommand).rejects(new Error("DynamoDB connection failed"));

    let thrownError: any;

    // Act & Assert
    try {
      await getMessageCollector(mockHandlerArgs);
    } catch (error) {
      thrownError = error;
    }

    // エラーが発生することを確認
    expect(thrownError).toBeDefined();
    expect(thrownError.message).toContain("DynamoDB connection failed");

    // ★ エラー発生時でもモック配列の状態が変更されていないことを確認
    expect(mockCounterRangeItems).toEqual(beforeCounterRanges);

    // モック設定を元に戻す
    setupSpecificTableMocks(ddbMock, tables);
  });
});
