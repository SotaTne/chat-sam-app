/** chat-sam-app-MessageTable用のサンプルデータ */
export const MockMessageItems = [
  {
    MessageNo: 1,
    UserId: "user123",
    Content: "Hello, this is the first message!",
    CreatedAt: Math.floor(new Date("2024-11-19T02:00:00Z").getTime() / 1000), // range-2024-11-19-00内
    Dummy: "ALL",
  },
  {
    MessageNo: 2,
    UserId: "user456",
    Content: "Second message from another user",
    CreatedAt: Math.floor(new Date("2024-11-19T04:00:00Z").getTime() / 1000), // range-2024-11-19-00内
    Dummy: "ALL",
  },
  {
    MessageNo: 3,
    UserId: "user123",
    Content: "Third message with some longer content to test various scenarios",
    CreatedAt: Math.floor(new Date("2024-11-19T08:00:00Z").getTime() / 1000), // range-2024-11-19-06内
    Dummy: "ALL",
  },
  {
    MessageNo: 4,
    UserId: "user789",
    Content: "Latest message for testing",
    CreatedAt: Math.floor(new Date("2024-11-19T10:00:00Z").getTime() / 1000), // range-2024-11-19-06内
    Dummy: "ALL",
  },
];

/** chat-sam-app-SessionTable用のサンプルデータ（UNIX秒で統一） */
export const MockSessionItems = [
  {
    SessionId: "session-123",
    ExpirationDate: Math.floor((Date.now() + 24 * 60 * 60 * 1000) / 1000), // 24時間後
  },
  {
    SessionId: "session-456",
    ExpirationDate: Math.floor((Date.now() + 12 * 60 * 60 * 1000) / 1000), // 12時間後
  },
  {
    SessionId: "session-expired",
    ExpirationDate: Math.floor((Date.now() - 60 * 60 * 1000) / 1000), // 1時間前（期限切れ）
  },
];

/** chat-sam-app-MessageCounterTable用のサンプルデータ */
export const MockMessageCounterItems = [
  {
    CounterId: "MESSAGE_COUNTER",
    Count: 4, // 現在のメッセージ数
  },
];

/** chat-sam-app-CounterRangeTable用のサンプルデータ */
export const MockCounterRangeItems = [
  {
    RecordId: "range-2024-11-19-00",
    Start: Math.floor(new Date("2024-11-19T00:00:00Z").getTime() / 1000),
    End: Math.floor(new Date("2024-11-19T06:00:00Z").getTime() / 1000),
    MessageCount: 15,
    UserCount: 5,
    CreatedAt: Math.floor(new Date("2024-11-19T06:00:00Z").getTime() / 1000),
    ExpirationDate: Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000), // 30日後
  },
  {
    RecordId: "range-2024-11-19-06",
    Start: Math.floor(new Date("2024-11-19T06:00:00Z").getTime() / 1000),
    End: Math.floor(new Date("2024-11-19T12:00:00Z").getTime() / 1000),
    MessageCount: 23,
    UserCount: 8,
    CreatedAt: Math.floor(new Date("2024-11-19T12:00:00Z").getTime() / 1000),
    ExpirationDate: Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000), // 30日後
  },
  {
    RecordId: "range-2024-11-18-18",
    Start: Math.floor(new Date("2024-11-18T18:00:00Z").getTime() / 1000),
    End: Math.floor(new Date("2024-11-19T00:00:00Z").getTime() / 1000),
    MessageCount: 7,
    UserCount: 3,
    CreatedAt: Math.floor(new Date("2024-11-19T00:00:00Z").getTime() / 1000),
    ExpirationDate: Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000), // 30日後
  },
];

// ========================================
// Immutable initial snapshots (readonly)
// ========================================

export const InitialMockMessageItems: ReadonlyArray<
  (typeof MockMessageItems)[number]
> = Object.freeze(MockMessageItems.map((x) => Object.freeze({ ...x })));

export const InitialMockSessionItems: ReadonlyArray<
  (typeof MockSessionItems)[number]
> = Object.freeze(MockSessionItems.map((x) => Object.freeze({ ...x })));

export const InitialMockMessageCounterItems: ReadonlyArray<
  (typeof MockMessageCounterItems)[number]
> = Object.freeze(MockMessageCounterItems.map((x) => Object.freeze({ ...x })));

export const InitialMockCounterRangeItems: ReadonlyArray<
  (typeof MockCounterRangeItems)[number]
> = Object.freeze(MockCounterRangeItems.map((x) => Object.freeze({ ...x })));
