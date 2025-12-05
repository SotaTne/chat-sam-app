// tests/jest.env.ts
process.env.AWS_SAM_LOCAL = "1";

// DynamoDB のテーブル名をテスト用に固定
process.env.MESSAGE_TABLE = "chat-sam-app-MessageTable";
process.env.SESSION_TABLE = "chat-sam-app-SessionTable";
process.env.MESSAGE_COUNTER_TABLE = "chat-sam-app-MessageCounterTable";
process.env.COUNTER_RANGE_TABLE = "chat-sam-app-CounterRangeTable";
