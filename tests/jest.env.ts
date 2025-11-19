// tests/jest.env.ts
process.env.AWS_SAM_LOCAL = "1";

// DynamoDB のテーブル名をテスト用に固定
process.env.MESSAGE_TABLE = "MessageTable";
process.env.SESSION_TABLE = "SessionTable";
process.env.MESSAGE_COUNTER_TABLE = "MessageCounterTable";
process.env.COUNTER_RANGE_TABLE = "CounterRangeTable";