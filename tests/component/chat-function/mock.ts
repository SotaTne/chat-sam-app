import { mockClient } from "aws-sdk-client-mock";
import {
  ScanCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
  PutCommand,
} from "../../../functions/chat-function/node_modules/@aws-sdk/lib-dynamodb";
import { InitialMockCounterRangeItems, InitialMockMessageCounterItems, InitialMockMessageItems, InitialMockSessionItems } from "../../mock-data";

type ScanMockMap = Record<string, any[]>;

// ========================================
// Table name constants (env + fallback)
// ========================================
const MESSAGE_TABLE = process.env.MESSAGE_TABLE || "MessageTable";
const SESSION_TABLE = process.env.SESSION_TABLE || "SessionTable";
const MESSAGE_COUNTER_TABLE =
  process.env.MESSAGE_COUNTER_TABLE || "MessageCounterTable";
const COUNTER_RANGE_TABLE =
  process.env.COUNTER_RANGE_TABLE || "CounterRangeTable";

// ========================================
// Mock Data Definitions (current mutable state)
// ========================================

/** MessageTable用のサンプルデータ */
export const mockMessageItems = InitialMockMessageItems.map((x) => ({ ...x }));

/** SessionTable用のサンプルデータ（UNIX秒で統一） */
export const mockSessionItems = InitialMockSessionItems.map((x) => ({ ...x }));

/** MessageCounterTable用のサンプルデータ */
export const mockMessageCounterItems = InitialMockMessageCounterItems.map((x) => ({ ...x }));

/** CounterRangeTable用のサンプルデータ */
export const mockCounterRangeItems = InitialMockCounterRangeItems.map((x) => ({ ...x }));

// ========================================
// Immutable initial snapshots (readonly)
// ========================================

export const initialMockMessageItems: ReadonlyArray<
  (typeof mockMessageItems)[number]
> = Object.freeze(
  mockMessageItems.map((x) => Object.freeze({ ...x }))
);

export const initialMockSessionItems: ReadonlyArray<
  (typeof mockSessionItems)[number]
> = Object.freeze(
  mockSessionItems.map((x) => Object.freeze({ ...x }))
);

export const initialMockMessageCounterItems: ReadonlyArray<
  (typeof mockMessageCounterItems)[number]
> = Object.freeze(
  mockMessageCounterItems.map((x) => Object.freeze({ ...x }))
);

export const initialMockCounterRangeItems: ReadonlyArray<
  (typeof mockCounterRangeItems)[number]
> = Object.freeze(
  mockCounterRangeItems.map((x) => Object.freeze({ ...x }))
);

// ========================================
// Core mock setup
// ========================================

export function setupDynamoMocks(
  ddbMock: ReturnType<typeof mockClient>,
  scanMap: ScanMockMap
) {
  // reset はテスト側（beforeEach/afterEach）で制御する

  // ========================================
  // Scan mocks (tables passed via scanMap)
  // ========================================
  for (const [tableName, items] of Object.entries(scanMap)) {
    ddbMock
      .on(ScanCommand, { TableName: tableName })
      .resolves({ Items: items });
  }

  // ========================================
  // MessageTable Query Commands
  // ========================================

  // MessageNo BETWEEN クエリ（ascending/descending対応）
  ddbMock
    .on(QueryCommand, {
      TableName: MESSAGE_TABLE,
      KeyConditionExpression:
        "Dummy = :dummy AND MessageNo BETWEEN :low AND :high",
    })
    .callsFake((input) => {
      const low = input.ExpressionAttributeValues?.[":low"] as number;
      const high = input.ExpressionAttributeValues?.[":high"] as number;
      const isDescending = input.ScanIndexForward === false;

      let filteredItems = mockMessageItems.filter(
        (item) => item.MessageNo >= low && item.MessageNo <= high
      );

      // ScanIndexForwardによる並び順制御
      filteredItems.sort((a, b) =>
        isDescending ? b.MessageNo - a.MessageNo : a.MessageNo - b.MessageNo
      );

      return Promise.resolve({ Items: filteredItems });
    });

  // getMessagesFromTimeStampRange用のQueryCommand (CreatedAt BETWEEN with GSI)
  ddbMock
    .on(QueryCommand, {
      TableName: MESSAGE_TABLE,
      IndexName: "CreatedAtIndex",
      KeyConditionExpression:
        "Dummy = :dummy AND CreatedAt BETWEEN :low AND :high",
    })
    .callsFake((input) => {
      const low = input.ExpressionAttributeValues?.[":low"] as number;
      const high = input.ExpressionAttributeValues?.[":high"] as number;

      const filteredItems = mockMessageItems
        .filter((item) => item.CreatedAt >= low && item.CreatedAt <= high)
        .sort((a, b) => a.CreatedAt - b.CreatedAt);

      return Promise.resolve({ Items: filteredItems });
    });

  // ========================================
  // MessageTable Put Commands
  // ========================================

  // putMessage用のPutCommand（モックデータに追加）
  ddbMock.on(PutCommand, { TableName: MESSAGE_TABLE }).callsFake((input) => {
    const newItem = input.Item as any;
    if (newItem) {
      // 既存のMessageNoがある場合は更新、なければ追加
      const existingIndex = mockMessageItems.findIndex(
        (item) => item.MessageNo === newItem.MessageNo
      );

      if (existingIndex >= 0) {
        mockMessageItems[existingIndex] = newItem;
      } else {
        mockMessageItems.push(newItem);
      }
    }
    return Promise.resolve({});
  });

  // ========================================
  // SessionTable Get/Put Commands
  // ========================================

  // getSession用のGetCommand
  ddbMock.on(GetCommand, { TableName: SESSION_TABLE }).callsFake((input) => {
    const sessionId = input.Key?.SessionId as string;
    const session = mockSessionItems.find(
      (item) => item.SessionId === sessionId
    );

    if (session) {
      return Promise.resolve({ Item: session });
    } else {
      return Promise.resolve({});
    }
  });

  // upsertSession用のPutCommand（モックデータに追加/更新）
  ddbMock.on(PutCommand, { TableName: SESSION_TABLE }).callsFake((input) => {
    const newItem = input.Item as any;
    if (newItem) {
      // 既存のSessionIdがある場合は更新、なければ追加
      const existingIndex = mockSessionItems.findIndex(
        (item) => item.SessionId === newItem.SessionId
      );

      if (existingIndex >= 0) {
        mockSessionItems[existingIndex] = newItem;
      } else {
        mockSessionItems.push(newItem);
      }
    }
    return Promise.resolve({});
  });

  // ========================================
  // MessageCounterTable Get/Update Commands
  // ========================================

  // getCurrent用のGetCommand
  ddbMock
    .on(GetCommand, { TableName: MESSAGE_COUNTER_TABLE })
    .callsFake((input) => {
      const counterId = input.Key?.CounterId as string;
      const counter = mockMessageCounterItems.find(
        (item) => item.CounterId === counterId
      );

      if (counter) {
        return Promise.resolve({ Item: counter });
      } else {
        return Promise.resolve({ Item: { CounterId: counterId, Count: 0 } });
      }
    });

  // nextMessageNo用のUpdateCommand
  ddbMock
    .on(UpdateCommand, { TableName: MESSAGE_COUNTER_TABLE })
    .callsFake((input) => {
      const counterId = input.Key?.CounterId as string;
      const counter = mockMessageCounterItems.find(
        (item) => item.CounterId === counterId
      );

      if (counter) {
        const newCount = counter.Count + 1;
        counter.Count = newCount; // モックデータを更新
        return Promise.resolve({ Attributes: { Count: newCount } });
      } else {
        // 新規作成の場合
        const newItem = { CounterId: counterId, Count: 1 };
        mockMessageCounterItems.push(newItem);
        return Promise.resolve({ Attributes: { Count: 1 } });
      }
    });

  // CounterRangeTable の Scan は上の scanMap 経由で既に設定済み
}

// ========================================
// Convenience Functions
// ========================================

/** 全テーブルのモックデータをまとめて設定するヘルパー関数 */
export function setupAllTableMocks(ddbMock: ReturnType<typeof mockClient>) {
  const allTableMocks: ScanMockMap = {
    [MESSAGE_TABLE]: mockMessageItems,
    [SESSION_TABLE]: mockSessionItems,
    [MESSAGE_COUNTER_TABLE]: mockMessageCounterItems,
    [COUNTER_RANGE_TABLE]: mockCounterRangeItems,
  };

  setupDynamoMocks(ddbMock, allTableMocks);
}

/** 特定のテーブルだけのモックデータを設定するヘルパー関数 */
export function setupSpecificTableMocks(
  ddbMock: ReturnType<typeof mockClient>,
  tables: {
    messageTable?: boolean;
    sessionTable?: boolean;
    messageCounterTable?: boolean;
    counterRangeTable?: boolean;
  }
) {
  const selectedMocks: ScanMockMap = {};

  if (tables.messageTable) {
    selectedMocks[MESSAGE_TABLE] = mockMessageItems;
  }
  if (tables.sessionTable) {
    selectedMocks[SESSION_TABLE] = mockSessionItems;
  }
  if (tables.messageCounterTable) {
    selectedMocks[MESSAGE_COUNTER_TABLE] = mockMessageCounterItems;
  }
  if (tables.counterRangeTable) {
    selectedMocks[COUNTER_RANGE_TABLE] = mockCounterRangeItems;
  }

  setupDynamoMocks(ddbMock, selectedMocks);
}

// ========================================
// Utility Functions for Testing
// ========================================

/** モックデータをリセットして初期状態に戻す */
export function resetMockData() {
  // MessageTable
  mockMessageItems.splice(
    0,
    mockMessageItems.length,
    ...initialMockMessageItems.map((x) => ({ ...x }))
  );

  // SessionTable
  mockSessionItems.splice(
    0,
    mockSessionItems.length,
    ...initialMockSessionItems.map((x) => ({ ...x }))
  );

  // MessageCounterTable
  mockMessageCounterItems.splice(
    0,
    mockMessageCounterItems.length,
    ...initialMockMessageCounterItems.map((x) => ({ ...x }))
  );

  // CounterRangeTable
  mockCounterRangeItems.splice(
    0,
    mockCounterRangeItems.length,
    ...initialMockCounterRangeItems.map((x) => ({ ...x }))
  );
}

/**
 * SessionのExpirationDateをDate型に変換するヘルパー
 * SessionRepository.getSession()の戻り値に合わせる
 */
export function convertSessionToRepositoryFormat(sessionItem: any) {
  return {
    ...sessionItem,
    ExpirationDate: new Date(sessionItem.ExpirationDate * 1000),
  };
}

/**
 * CounterRangeのExpirationDateをDate型に変換するヘルパー
 * MessageRangeRepository.getAllCounters()の戻り値に合わせる
 */
export function convertCounterRangeToRepositoryFormat(
  counterRangeItems: any[]
) {
  return counterRangeItems.map((item) => ({
    ...item,
    ExpirationDate: new Date(item.ExpirationDate * 1000),
  }));
}