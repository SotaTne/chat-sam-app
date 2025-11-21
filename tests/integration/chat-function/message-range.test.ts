import { DynamoDBClient } from '../../../functions/chat-function/node_modules/@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from "../../../functions/chat-function/node_modules/@aws-sdk/lib-dynamodb";
import { MessageRangeRepository, MessageRangeItems } from '../../../functions/chat-function/repository/message-range';
import { cleanUP, getDynamoDBClient, healthCheck } from './utils';

describe('MessageRangeRepository Integration Tests', () => {
  let dynamoClient: DynamoDBClient;
  let docClient: DynamoDBDocumentClient;
  let messageRangeRepository: MessageRangeRepository;
  const tableName = 'CounterRangeTable';

  beforeAll(async () => {
    dynamoClient = getDynamoDBClient();

    await healthCheck();

    docClient = DynamoDBDocumentClient.from(dynamoClient);
    messageRangeRepository = new MessageRangeRepository(docClient);
  });

  beforeEach(async () => {
    await cleanUP(tableName);
  });

  afterAll(async () => {
    await cleanUP(tableName);
    dynamoClient.destroy();
  });

  describe('getAllCounters', () => {
    test('空のテーブルの場合は空配列を返すこと', async () => {
      const result = await messageRangeRepository.getAllCounters();
      
      expect(result).toEqual([]);
    });

    test('登録済みのカウンターデータを正しく取得できること', async () => {
      // Arrange: テストデータを直接DynamoDBに登録
      const testData = [
        {
          RecordId: 'range-2024-11-21-00',
          Start: Math.floor(new Date('2024-11-21T00:00:00Z').getTime() / 1000),
          End: Math.floor(new Date('2024-11-21T06:00:00Z').getTime() / 1000),
          MessageCount: 15,
          UserCount: 8,
          CreatedAt: Math.floor(Date.now() / 1000),
          ExpirationDate: Math.floor(new Date('2024-12-21T00:00:00Z').getTime() / 1000), // Unix timestamp
        },
        {
          RecordId: 'range-2024-11-21-06',
          Start: Math.floor(new Date('2024-11-21T06:00:00Z').getTime() / 1000),
          End: Math.floor(new Date('2024-11-21T12:00:00Z').getTime() / 1000),
          MessageCount: 23,
          UserCount: 12,
          CreatedAt: Math.floor(Date.now() / 1000),
          ExpirationDate: Math.floor(new Date('2024-12-21T06:00:00Z').getTime() / 1000),
        },
      ];

      // テストデータを投入
      for (const data of testData) {
        await docClient.send(new PutCommand({
          TableName: tableName,
          Item: data,
        }));
      }

      // Act
      const result = await messageRangeRepository.getAllCounters();

      // Assert
      expect(result).toHaveLength(2);
      
      // データの検証（順序は保証されないのでRecordIdでソート）
      const sortedResult = result.sort((a, b) => a.RecordId.localeCompare(b.RecordId));
      
      expect(sortedResult[0].RecordId).toBe('range-2024-11-21-00');
      expect(sortedResult[0].MessageCount).toBe(15);
      expect(sortedResult[0].UserCount).toBe(8);
      expect(sortedResult[0].ExpirationDate).toBeInstanceOf(Date);
      
      expect(sortedResult[1].RecordId).toBe('range-2024-11-21-06');
      expect(sortedResult[1].MessageCount).toBe(23);
      expect(sortedResult[1].UserCount).toBe(12);
      expect(sortedResult[1].ExpirationDate).toBeInstanceOf(Date);
    });

    test('ExpirationDateがUnix timestampからDateオブジェクトに正しく変換されること', async () => {
      // Arrange
      const expirationTimestamp = Math.floor(new Date('2024-12-25T10:30:00Z').getTime() / 1000);
      const testData = {
        RecordId: 'range-2024-11-25-10',
        Start: Math.floor(new Date('2024-11-25T10:00:00Z').getTime() / 1000),
        End: Math.floor(new Date('2024-11-25T16:00:00Z').getTime() / 1000),
        MessageCount: 5,
        UserCount: 3,
        CreatedAt: Math.floor(Date.now() / 1000),
        ExpirationDate: expirationTimestamp,
      };

      await docClient.send(new PutCommand({
        TableName: tableName,
        Item: testData,
      }));

      // Act
      const result = await messageRangeRepository.getAllCounters();

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].ExpirationDate).toBeInstanceOf(Date);
      expect(result[0].ExpirationDate.getTime()).toBe(expirationTimestamp * 1000);
    });

    test('複数のカウンターデータを正しく取得できること', async () => {
      // Arrange: 複数日にわたるテストデータ
      const testRanges = [];
      for (let day = 20; day <= 22; day++) {
        for (let hour = 0; hour < 24; hour += 6) {
          const startTime = new Date(`2024-11-${day}T${hour.toString().padStart(2, '0')}:00:00Z`);
          const endTime = new Date(startTime.getTime() + 6 * 60 * 60 * 1000); // +6時間
          
          testRanges.push({
            RecordId: `range-2024-11-${day}-${hour.toString().padStart(2, '0')}`,
            Start: Math.floor(startTime.getTime() / 1000),
            End: Math.floor(endTime.getTime() / 1000),
            MessageCount: Math.floor(Math.random() * 50) + 1,
            UserCount: Math.floor(Math.random() * 20) + 1,
            CreatedAt: Math.floor(Date.now() / 1000),
            ExpirationDate: Math.floor(new Date('2024-12-25T00:00:00Z').getTime() / 1000),
          });
        }
      }

      // データ投入
      for (const range of testRanges) {
        await docClient.send(new PutCommand({
          TableName: tableName,
          Item: range,
        }));
      }

      // Act
      const result = await messageRangeRepository.getAllCounters();

      // Assert
      expect(result).toHaveLength(testRanges.length); // 3日 × 4区間/日 = 12
      
      // 全てのレコードが正しく取得されていることを確認
      const resultRecordIds = result.map(r => r.RecordId).sort();
      const expectedRecordIds = testRanges.map(r => r.RecordId).sort();
      expect(resultRecordIds).toEqual(expectedRecordIds);
      
      // データ型の検証
      result.forEach(item => {
        expect(typeof item.RecordId).toBe('string');
        expect(typeof item.Start).toBe('number');
        expect(typeof item.End).toBe('number');
        expect(typeof item.MessageCount).toBe('number');
        expect(typeof item.UserCount).toBe('number');
        expect(typeof item.CreatedAt).toBe('number');
        expect(item.ExpirationDate).toBeInstanceOf(Date);
      });
    });
  });

  describe('データ構造テスト', () => {
    test('MessageRangeItemsの型定義に従ったデータが取得されること', async () => {
      // Arrange
      const testData = {
        RecordId: 'range-test-structure',
        Start: 1732147200, // 2024-11-21 00:00:00 UTC
        End: 1732168800,   // 2024-11-21 06:00:00 UTC
        MessageCount: 42,
        UserCount: 17,
        CreatedAt: Math.floor(Date.now() / 1000),
        ExpirationDate: Math.floor(new Date('2024-12-31T23:59:59Z').getTime() / 1000),
      };

      await docClient.send(new PutCommand({
        TableName: tableName,
        Item: testData,
      }));

      // Act
      const result = await messageRangeRepository.getAllCounters();

      // Assert: 型定義との一致確認
      expect(result).toHaveLength(1);
      const item = result[0] as MessageRangeItems;
      
      expect(item.RecordId).toBe(testData.RecordId);
      expect(item.Start).toBe(testData.Start);
      expect(item.End).toBe(testData.End);
      expect(item.MessageCount).toBe(testData.MessageCount);
      expect(item.UserCount).toBe(testData.UserCount);
      expect(item.CreatedAt).toBe(testData.CreatedAt);
      expect(item.ExpirationDate).toEqual(new Date(testData.ExpirationDate * 1000));
    });
  });

  describe('異常系テスト', () => {
    test('無効なExpirationDateでもエラーにならないこと', async () => {
      // Arrange: 無効な日付データ
      const testData = {
        RecordId: 'range-invalid-date',
        Start: 1732147200,
        End: 1732168800,
        MessageCount: 1,
        UserCount: 1,
        CreatedAt: Math.floor(Date.now() / 1000),
        ExpirationDate: 'invalid-date', // 文字列（本来は数値であるべき）
      };

      await docClient.send(new PutCommand({
        TableName: tableName,
        Item: testData,
      }));

      // Act & Assert: エラーにならずに処理されることを確認
      await expect(messageRangeRepository.getAllCounters()).resolves.not.toThrow();
    });
  });
});