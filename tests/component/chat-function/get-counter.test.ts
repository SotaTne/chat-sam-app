import { mockClient } from "aws-sdk-client-mock";
import {
  DynamoDBDocumentClient,
} from "../../../functions/chat-function/node_modules/@aws-sdk/lib-dynamodb";

import {
  resetMockData,
  setupSpecificTableMocks,
  mockCounterRangeItems,
  mockMessageItems,
  initialMockCounterRangeItems,
  initialMockMessageItems,
} from "./mock";

import { getCounterHandler } from "../../../functions/chat-function/router/get-counter";

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
  resetMockData(); // ddbMock.reset() は呼ばない
});

describe("GetCounterHandler", () => {
  it("カウンタレンジとメッセージ一覧を返し、テーブルの内容を変更しないこと", async () => {
    // Arrange
    const mockHandlerArgs = {
      params: null,
      sessionId: "test-session",
      body: null,
      header: {},
    };

    // 実行前の配列スナップショット（実配列のコピー）
    const beforeMessages = mockMessageItems.map((x) => ({ ...x }));
    const beforeRanges = mockCounterRangeItems.map((x) => ({ ...x }));

    // Act
    const result = await getCounterHandler(mockHandlerArgs);

    // Assert
    expect(result.statusCode).toBe(200);

    const responseBody = JSON.parse(result.body);
    expect(Array.isArray(responseBody)).toBe(true);

    // handler が返した range の RecordId 一覧
    const rangeIds: string[] = responseBody.map(
      (rm: any) => rm.range.RecordId
    );

    // 初期レンジがすべてレスポンスに含まれていることを確認
    initialMockCounterRangeItems.forEach((base) => {
      expect(rangeIds).toContain(base.RecordId);
    });

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

    // ★ 実際のメッセージカウントと具体的なMessageNoを検証
    const range00 = responseBody.find((rm: any) => rm.range.RecordId === "range-2024-11-19-00");
    const range06 = responseBody.find((rm: any) => rm.range.RecordId === "range-2024-11-19-06");

    expect(range00).toBeDefined();
    expect(range06).toBeDefined();

    // range-2024-11-19-00 (00:00-06:00) には MessageNo 1, 2 が含まれるはず
    expect(Array.isArray(range00.messages)).toBe(true);
    expect(range00.messages.length).toBeGreaterThan(0);
    
    const range00MessageNos = range00.messages.map((m: any) => m.MessageNo).sort((a: number, b: number) => a - b);
    expect(range00MessageNos).toContain(1); // 02:00 のメッセージ
    expect(range00MessageNos).toContain(2); // 04:00 のメッセージ
    
    // ★ 範囲集計ロジックの完全性検証：正確なセットを検証
    expect(range00MessageNos).toEqual([1, 2]); // 期待される完全なセット

    // range-2024-11-19-06 (06:00-12:00) には MessageNo 3, 4 が含まれるはず
    expect(Array.isArray(range06.messages)).toBe(true);
    expect(range06.messages.length).toBeGreaterThan(0);
    
    const range06MessageNos = range06.messages.map((m: any) => m.MessageNo).sort((a: number, b: number) => a - b);
    expect(range06MessageNos).toContain(3); // 08:00 のメッセージ
    expect(range06MessageNos).toContain(4); // 10:00 のメッセージ
    
    // ★ 範囲集計ロジックの完全性検証：正確なセットを検証
    expect(range06MessageNos).toEqual([3, 4]); // 期待される完全なセット

    // ★ Dynamo のモック配列が一切変化していないこと
    expect(mockMessageItems).toEqual(beforeMessages);
    expect(mockCounterRangeItems).toEqual(beforeRanges);

    // ついでに「初期状態」と同じであることも保証しておく
    expect(mockMessageItems).toEqual(initialMockMessageItems);
    expect(mockCounterRangeItems).toEqual(initialMockCounterRangeItems);
  });

  it("各レンジに対応するメッセージがタイムスタンプで正しくフィルタされ、テーブルを変更しないこと", async () => {
    // Arrange
    const mockHandlerArgs = {
      params: null,
      sessionId: "test-session",
      body: null,
      header: {},
    };

    const beforeMessages = mockMessageItems.map((x) => ({ ...x }));
    const beforeRanges = mockCounterRangeItems.map((x) => ({ ...x }));

    // Act
    const result = await getCounterHandler(mockHandlerArgs);

    // Assert
    expect(result.statusCode).toBe(200);

    const responseBody = JSON.parse(result.body);

    // 各レンジに対してメッセージが適切にフィルタリングされているかチェック
    for (const rangeMessage of responseBody) {
      const { range, messages } = rangeMessage;

      for (const message of messages) {
        expect(message.CreatedAt).toBeGreaterThanOrEqual(range.Start);
        expect(message.CreatedAt).toBeLessThanOrEqual(range.End);
      }
    }

    // ★ テーブル内容が変わっていないこと
    expect(mockMessageItems).toEqual(beforeMessages);
    expect(mockCounterRangeItems).toEqual(beforeRanges);
  });

  it("カウンタレンジが空の場合は空配列を返し、テーブルの状態が意図通りであること", async () => {
    // Arrange - モックデータを空にする（CounterRangeTable だけ）
    const originalData = [...mockCounterRangeItems];
    mockCounterRangeItems.splice(0, mockCounterRangeItems.length);
    expect(mockCounterRangeItems.length).toBe(0); // 本当に空になっていることを確認

    const beforeMessages = mockMessageItems.map((x) => ({ ...x }));

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

      // ★ MessageTable は一切変更されていないこと
      expect(mockMessageItems).toEqual(beforeMessages);
      // CounterRangeTable は「空のまま」なのがこのケースの意図
      expect(mockCounterRangeItems.length).toBe(0);
    } finally {
      // Cleanup - モックデータを復元
      mockCounterRangeItems.push(...originalData);
      expect(mockCounterRangeItems.length).toBe(
        initialMockCounterRangeItems.length
      );
    }
  });

  it("該当メッセージが存在しないレンジの場合は空の messages を返し、追加されたレンジのみ増えていること", async () => {
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

    const beforeMessages = mockMessageItems.map((x) => ({ ...x }));

    // 一時的に未来のレンジを追加
    mockCounterRangeItems.push(futureRange);

    // 現在の mock 配列が「初期 + 1件」になっていること
    expect(mockCounterRangeItems.length).toBe(
      initialMockCounterRangeItems.length + 1
    );

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

      // handler が返した range の RecordId 一覧
      const rangeIds: string[] = responseBody.map(
        (rm: any) => rm.range.RecordId
      );

      // 未来のレンジに対応するエントリを探す
      const futureRangeResult = responseBody.find(
        (rm: any) => rm.range.RecordId === "range-future"
      );

      expect(futureRangeResult).toBeDefined();
      expect(futureRangeResult.messages).toEqual([]);

      // 初期レンジがすべてレスポンスに含まれていることも確認
      initialMockCounterRangeItems.forEach((base) => {
        expect(rangeIds).toContain(base.RecordId);
      });

      // 未来レンジも含まれていること
      expect(rangeIds).toContain("range-future");

      // ★ MessageTable は変化していないこと
      expect(mockMessageItems).toEqual(beforeMessages);

      // ★ CounterRangeTable には
      //    - initialMockCounterRangeItems
      //    - futureRange
      // 以外が存在しないことを確認
      const extraRanges = mockCounterRangeItems.filter(
        (item) =>
          !initialMockCounterRangeItems.some(
            (base) => base.RecordId === item.RecordId
          )
      );
      expect(extraRanges).toHaveLength(1);
      expect(extraRanges[0].RecordId).toBe("range-future");
    } finally {
      // Cleanup - 追加したレンジを削除
      const index = mockCounterRangeItems.findIndex(
        (item: any) => item.RecordId === "range-future"
      );
      if (index >= 0) {
        mockCounterRangeItems.splice(index, 1);
      }

      // 削除後、現在の mock 配列の長さが初期スナップショットと一致していること
      expect(mockCounterRangeItems.length).toBe(
        initialMockCounterRangeItems.length
      );
    }
  });

  it("ハンドラの戻り値が JSON 文字列として妥当な形式であり、テーブルを変更しないこと", async () => {
    // Arrange
    const mockHandlerArgs = {
      params: null,
      sessionId: "test-session",
      body: null,
      header: {},
    };

    const beforeMessages = mockMessageItems.map((x) => ({ ...x }));
    const beforeRanges = mockCounterRangeItems.map((x) => ({ ...x }));

    // Act
    const result = await getCounterHandler(mockHandlerArgs);

    // Assert
    expect(result).toHaveProperty("statusCode");
    expect(result).toHaveProperty("body");
    expect(typeof result.body).toBe("string");

    // JSONパースが成功することを確認
    expect(() => JSON.parse(result.body)).not.toThrow();

    // ★ テーブルが変化していないこと
    expect(mockMessageItems).toEqual(beforeMessages);
    expect(mockCounterRangeItems).toEqual(beforeRanges);
  });
});