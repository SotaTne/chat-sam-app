import { DynamoDBClient } from '../../../functions/chat-function/node_modules/@aws-sdk/client-dynamodb';

import {
  DynamoDBDocumentClient
} from "../../../functions/chat-function/node_modules/@aws-sdk/lib-dynamodb";

import { MessageCounterRepository } from '../../../functions/chat-function/repository/message-counter';
import { cleanUP, cleanUpAllTables, getDynamoDBClient, healthCheck } from '../utils';

describe('MessageCounterRepository Integration Tests', () => {
  let dynamoClient: DynamoDBClient;
  let docClient: DynamoDBDocumentClient;
  let repository: MessageCounterRepository;
  const tableName = 'MessageCounterTable';

  beforeAll(async () => {
    // ヘルスチェック
    console.log('🔍 DynamoDB Local ヘルスチェック...');
    
    dynamoClient = getDynamoDBClient();
    
    await healthCheck()

    docClient = DynamoDBDocumentClient.from(dynamoClient);
    repository = new MessageCounterRepository(docClient);
  });

  beforeEach(async () => {
    await cleanUP(tableName)
  });

  afterAll(async () => {
    // 最終クリーンアップ
    await cleanUpAllTables();
  });

  describe('nextMessageNo', () => {
    test('初回呼び出し時は1を返すこと', async () => {
      const result = await repository.nextMessageNo();
      
      expect(result).toBe(1);
    });

    test('連続呼び出し時は正しくインクリメントされること', async () => {
      const first = await repository.nextMessageNo();
      const second = await repository.nextMessageNo();
      const third = await repository.nextMessageNo();
      
      expect(first).toBe(1);
      expect(second).toBe(2);
      expect(third).toBe(3);
    });

    test('複数回のインクリメント後、正しい値を返すこと', async () => {
      // 5回インクリメント
      for (let i = 1; i <= 5; i++) {
        const result = await repository.nextMessageNo();
        expect(result).toBe(i);
      }
    });
  });

  describe('getCurrent', () => {
    test('カウンターが存在しない場合は0を返すこと', async () => {
      const result = await repository.getCurrent();
      
      expect(result).toBe(0);
    });

    test('nextMessageNo呼び出し後、正しい現在値を取得できること', async () => {
      // インクリメント実行
      await repository.nextMessageNo(); // 1
      await repository.nextMessageNo(); // 2
      await repository.nextMessageNo(); // 3
      
      // 現在値取得
      const current = await repository.getCurrent();
      
      expect(current).toBe(3);
    });

    test('getCurrent呼び出しがカウンターをインクリメントしないこと', async () => {
      // 初期化
      await repository.nextMessageNo(); // 1
      
      // 複数回getCurrent呼び出し
      const first = await repository.getCurrent();
      const second = await repository.getCurrent();
      const third = await repository.getCurrent();
      
      expect(first).toBe(1);
      expect(second).toBe(1);
      expect(third).toBe(1);
    });
  });

  describe('並行処理テスト', () => {
    test('並行してnextMessageNoを呼び出しても重複しない値を返すこと', async () => {
      const promises = [];
      const expectedValues = [1, 2, 3, 4, 5];
      
      // 5つの並行処理でnextMessageNoを実行
      for (let i = 0; i < 5; i++) {
        promises.push(repository.nextMessageNo());
      }
      
      const results = await Promise.all(promises);
      
      // 結果をソートして期待値と比較
      results.sort((a, b) => a - b);
      expect(results).toEqual(expectedValues);
    });
  });

  describe('永続性テスト', () => {
    test('リポジトリインスタンス再作成後も値が保持されること', async () => {
      // 初期リポジトリで値を設定
      await repository.nextMessageNo(); // 1
      await repository.nextMessageNo(); // 2
      
      // 新しいリポジトリインスタンスを作成
      const newRepository = new MessageCounterRepository(docClient);
      
      // 現在値確認
      const current = await newRepository.getCurrent();
      expect(current).toBe(2);
      
      // 次の値確認
      const next = await newRepository.nextMessageNo();
      expect(next).toBe(3);
    });
  });

  describe('異常系テスト', () => {
    test('大量のインクリメント後も正常に動作すること', async () => {
      let lastValue = 0;
      
      // 100回インクリメント
      for (let i = 1; i <= 100; i++) {
        lastValue = await repository.nextMessageNo();
      }
      
      expect(lastValue).toBe(100);
      
      // 現在値確認
      const current = await repository.getCurrent();
      expect(current).toBe(100);
    });
  });

  describe('エラーハンドリングテスト', () => {
    test('テーブルが存在しない場合のエラー処理', async () => {
        // 存在しないテーブル名でリポジトリ作成
        process.env.MESSAGE_COUNTER_TABLE = 'NonExistentTable';
        const errorRepository = new MessageCounterRepository(docClient);
        
        await expect(errorRepository.nextMessageNo()).rejects.toThrow();
        
        // 元に戻す
        process.env.MESSAGE_COUNTER_TABLE = tableName;
    });
  });
});