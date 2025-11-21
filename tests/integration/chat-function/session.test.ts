import { DynamoDBClient } from '../../../functions/chat-function/node_modules/@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from "../../../functions/chat-function/node_modules/@aws-sdk/lib-dynamodb";
import { SessionRepository, SessionItem } from '../../../functions/chat-function/repository/session';
import { cleanUP, getDynamoDBClient, healthCheck } from './utils';

describe('SessionRepository Integration Tests', () => {
  let dynamoClient: DynamoDBClient;
  let docClient: DynamoDBDocumentClient;
  let sessionRepository: SessionRepository;
  const tableName = 'SessionTable';

  beforeAll(async () => {
    dynamoClient = getDynamoDBClient();
    await healthCheck();

    docClient = DynamoDBDocumentClient.from(dynamoClient);
    sessionRepository = new SessionRepository(docClient);
  });

  beforeEach(async () => {
    await cleanUP(tableName);
  });

  afterAll(async () => {
    await cleanUP(tableName);
    dynamoClient.destroy();
  });

  describe('upsertSession', () => {
    test('新しいセッションを正しく作成できること', async () => {
      // Arrange
      const sessionData: SessionItem = {
        SessionId: 'test-session-001',
        ExpirationDate: new Date('2024-12-25T10:30:00Z'),
      };

      // Act
      await sessionRepository.upsertSession(sessionData);

      // Assert: 作成されたセッションを取得して確認
      const retrievedSession = await sessionRepository.getSession(sessionData.SessionId);
      
      expect(retrievedSession).toBeDefined();
      expect(retrievedSession!.SessionId).toBe(sessionData.SessionId);
      expect(retrievedSession!.ExpirationDate).toEqual(sessionData.ExpirationDate);
    });

    test('既存のセッションを更新できること', async () => {
      // Arrange: 初期セッションを作成
      const initialSession: SessionItem = {
        SessionId: 'test-session-update',
        ExpirationDate: new Date('2024-11-25T10:00:00Z'),
      };
      await sessionRepository.upsertSession(initialSession);

      // Act: 同じSessionIdで異なるExpirationDateで更新
      const updatedSession: SessionItem = {
        SessionId: 'test-session-update',
        ExpirationDate: new Date('2024-12-31T23:59:59Z'),
      };
      await sessionRepository.upsertSession(updatedSession);

      // Assert: 更新されたデータを確認
      const retrievedSession = await sessionRepository.getSession(updatedSession.SessionId);
      
      expect(retrievedSession).toBeDefined();
      expect(retrievedSession!.SessionId).toBe(updatedSession.SessionId);
      expect(retrievedSession!.ExpirationDate).toEqual(updatedSession.ExpirationDate);
      // 初期の日時ではないことを確認
      expect(retrievedSession!.ExpirationDate).not.toEqual(initialSession.ExpirationDate);
    });

    test('複数の異なるセッションを作成できること', async () => {
      // Arrange & Act
      const sessions: SessionItem[] = [
        {
          SessionId: 'session-001',
          ExpirationDate: new Date('2024-12-01T00:00:00Z'),
        },
        {
          SessionId: 'session-002',
          ExpirationDate: new Date('2024-12-15T12:30:00Z'),
        },
        {
          SessionId: 'session-003',
          ExpirationDate: new Date('2024-12-31T23:59:59Z'),
        },
      ];

      for (const session of sessions) {
        await sessionRepository.upsertSession(session);
      }

      // Assert: 全てのセッションが正しく作成されていることを確認
      for (const session of sessions) {
        const retrieved = await sessionRepository.getSession(session.SessionId);
        expect(retrieved).toBeDefined();
        expect(retrieved!.SessionId).toBe(session.SessionId);
        expect(retrieved!.ExpirationDate).toEqual(session.ExpirationDate);
      }
    });
  });

  describe('getSession', () => {
    test('存在するセッションを正しく取得できること', async () => {
      // Arrange: テストセッションを作成
      const testSession: SessionItem = {
        SessionId: 'test-get-session',
        ExpirationDate: new Date('2024-12-20T15:45:30Z'),
      };
      await sessionRepository.upsertSession(testSession);

      // Act
      const result = await sessionRepository.getSession(testSession.SessionId);

      // Assert
      expect(result).toBeDefined();
      expect(result!.SessionId).toBe(testSession.SessionId);
      expect(result!.ExpirationDate).toEqual(testSession.ExpirationDate);
    });

    test('存在しないセッションの場合はundefinedを返すこと', async () => {
      // Act
      const result = await sessionRepository.getSession('non-existent-session');

      // Assert
      expect(result).toBeUndefined();
    });

    test('日時変換が正しく動作することを確認', async () => {
      // Arrange: 特定の日時でセッション作成
      const specificDate = new Date('2024-11-21T14:30:45.123Z'); // ミリ秒も含む
      const testSession: SessionItem = {
        SessionId: 'test-date-conversion',
        ExpirationDate: specificDate,
      };
      await sessionRepository.upsertSession(testSession);

      // Act
      const result = await sessionRepository.getSession(testSession.SessionId);

      // Assert: Unix timestamp経由でDateオブジェクトに変換されるため、秒精度になる
      expect(result).toBeDefined();
      expect(result!.ExpirationDate).toBeInstanceOf(Date);
      
      // 秒精度での比較（DynamoDBはUnix timestampで保存されるため）
      const expectedTimestamp = Math.floor(specificDate.getTime() / 1000) * 1000;
      expect(result!.ExpirationDate.getTime()).toBe(expectedTimestamp);
    });
  });

  describe('統合テスト', () => {
    test('セッション作成→取得→更新→取得の一連の流れが正常に動作すること', async () => {
      const sessionId = 'integration-test-session';
      
      // Step 1: セッション作成
      const initialSession: SessionItem = {
        SessionId: sessionId,
        ExpirationDate: new Date('2024-12-01T10:00:00Z'),
      };
      await sessionRepository.upsertSession(initialSession);

      // Step 2: 作成されたセッション取得
      const retrieved1 = await sessionRepository.getSession(sessionId);
      expect(retrieved1).toBeDefined();
      expect(retrieved1!.SessionId).toBe(sessionId);
      expect(retrieved1!.ExpirationDate).toEqual(initialSession.ExpirationDate);

      // Step 3: セッション更新
      const updatedSession: SessionItem = {
        SessionId: sessionId,
        ExpirationDate: new Date('2024-12-15T18:30:00Z'),
      };
      await sessionRepository.upsertSession(updatedSession);

      // Step 4: 更新されたセッション取得
      const retrieved2 = await sessionRepository.getSession(sessionId);
      expect(retrieved2).toBeDefined();
      expect(retrieved2!.SessionId).toBe(sessionId);
      expect(retrieved2!.ExpirationDate).toEqual(updatedSession.ExpirationDate);
      expect(retrieved2!.ExpirationDate).not.toEqual(initialSession.ExpirationDate);
    });

    test('複数セッションの並行操作が正常に動作すること', async () => {
      // Arrange & Act: 複数セッションを並行で作成
      const sessions = Array.from({ length: 5 }, (_, i) => ({
        SessionId: `parallel-session-${i + 1}`,
        ExpirationDate: new Date(`2024-12-${(i + 1).toString().padStart(2, '0')}T12:00:00Z`),
      }));

      // 並行でセッション作成
      await Promise.all(
        sessions.map(session => sessionRepository.upsertSession(session))
      );

      // Assert: 並行で全セッション取得・確認
      const retrievedSessions = await Promise.all(
        sessions.map(session => sessionRepository.getSession(session.SessionId))
      );

      retrievedSessions.forEach((retrieved, index) => {
        expect(retrieved).toBeDefined();
        expect(retrieved!.SessionId).toBe(sessions[index].SessionId);
        expect(retrieved!.ExpirationDate).toEqual(sessions[index].ExpirationDate);
      });
    });
  });

  describe('異常系テスト', () => {
    test('有効な特殊文字を含むSessionIdは正常に処理されること', async () => {
      // Act & Assert: 特殊文字を含むSessionId（空文字列は除く、DynamoDB制約のため）
      const validSessionIds = [
        'session-with-特殊文字-123',
        'session@#$%^&*()',
        'very-long-session-id-' + 'x'.repeat(100),
      ];

      for (const sessionId of validSessionIds) {
        const sessionData: SessionItem = {
          SessionId: sessionId,
          ExpirationDate: new Date('2024-12-25T10:30:00Z'),
        };

        // upsert と get がエラーにならないことを確認
        await expect(sessionRepository.upsertSession(sessionData)).resolves.not.toThrow();
        await expect(sessionRepository.getSession(sessionId)).resolves.not.toThrow();
      }
    });

    test('空文字列のSessionIdでは適切にエラーがスローされること', async () => {
      // Arrange: 空文字列とホワイトスペースのみのSessionId
      const emptySessionData: SessionItem = {
        SessionId: '',
        ExpirationDate: new Date('2024-12-25T10:30:00Z'),
      };
      
      const whitespaceSessionData: SessionItem = {
        SessionId: '   ',
        ExpirationDate: new Date('2024-12-25T10:30:00Z'),
      };

      // Act & Assert: 空文字列とホワイトスペースのみのSessionIdはバリデーションエラーになる
      await expect(sessionRepository.upsertSession(emptySessionData)).rejects.toThrow('SessionId cannot be empty');
      await expect(sessionRepository.getSession('')).rejects.toThrow('SessionId cannot be empty');
      
      await expect(sessionRepository.upsertSession(whitespaceSessionData)).rejects.toThrow('SessionId cannot be empty');
      await expect(sessionRepository.getSession('   ')).rejects.toThrow('SessionId cannot be empty');
    });

    test('過去の日付のExpirationDateでも正常に処理されること', async () => {
      // Arrange: 過去の日付
      const pastSession: SessionItem = {
        SessionId: 'past-session',
        ExpirationDate: new Date('2020-01-01T00:00:00Z'), // 過去の日付
      };

      // Act & Assert
      await expect(sessionRepository.upsertSession(pastSession)).resolves.not.toThrow();
      
      const retrieved = await sessionRepository.getSession(pastSession.SessionId);
      expect(retrieved).toBeDefined();
      expect(retrieved!.ExpirationDate).toEqual(pastSession.ExpirationDate);
    });

    test('極端に遠い未来の日付でも正常に処理されること', async () => {
      // Arrange: 遠い未来の日付
      const futureSession: SessionItem = {
        SessionId: 'future-session',
        ExpirationDate: new Date('2099-12-31T23:59:59Z'),
      };

      // Act & Assert
      await expect(sessionRepository.upsertSession(futureSession)).resolves.not.toThrow();
      
      const retrieved = await sessionRepository.getSession(futureSession.SessionId);
      expect(retrieved).toBeDefined();
      expect(retrieved!.ExpirationDate).toEqual(futureSession.ExpirationDate);
    });
  });
});