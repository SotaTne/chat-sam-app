import { DynamoDBClient, DeleteTableCommand, CreateTableCommand, CreateTableCommandInput, DescribeTableCommand, ListTablesCommand } from '../../../functions/counter-function/node_modules/@aws-sdk/client-dynamodb';
import CounterRangeTableSchema from "../../../docker/CounterRangeTable.json" assert { type: "json" };
import MessageCounterTableSchema from "../../../docker/MessageCounterTable.json" assert { type: "json" };
import MessageTableSchema from "../../../docker/MessageTable.json" assert { type: "json" };
import SessionTableSchema from "../../../docker/SessionTable.json" assert { type: "json" };

const TABLE_NAMES = [
  "MessageTable",
  "SessionTable", 
  "MessageCounterTable",
  "CounterRangeTable",
] as const;

type TableName = typeof TABLE_NAMES[number];

const TABLE_SCHEMAS: Record<TableName, CreateTableCommandInput> = {
  MessageTable: MessageTableSchema as CreateTableCommandInput,
  SessionTable: SessionTableSchema as CreateTableCommandInput,
  MessageCounterTable: MessageCounterTableSchema as CreateTableCommandInput,
  CounterRangeTable: CounterRangeTableSchema as CreateTableCommandInput,
} as const;

export function getDynamoDBClient(){
  const dynamoClient = new DynamoDBClient({
    endpoint: 'http://localhost:8000',
    region: 'ap-northeast-1',
    credentials: {
      accessKeyId: 'dummy',
      secretAccessKey: 'dummy'
    }
  });
  return dynamoClient;
}

/**
 * テーブルが存在するかチェック
 */
async function tableExists(dynamoClient: DynamoDBClient, tableName: string): Promise<boolean> {
  try {
    await dynamoClient.send(new DescribeTableCommand({ TableName: tableName }));
    return true;
  } catch (error) {
    if (error instanceof Error){
      if (error.name === 'ResourceNotFoundException') {
        return false;
      }
      console.error(`❌ テーブル存在チェック中にエラー発生:`, error);
    }
    throw error;
  }
}

/**
 * テーブルが削除完了まで待機
 */
async function waitForTableDeletion(dynamoClient: DynamoDBClient, tableName: string): Promise<void> {
  let attempts = 0;
  const maxAttempts = 30; // 最大30秒待機
  
  while (attempts < maxAttempts) {
    const exists = await tableExists(dynamoClient, tableName);
    if (!exists) {
      return; // 削除完了
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000)); // 1秒待機
    attempts++;
  }
  
  throw new Error(`テーブル ${tableName} の削除がタイムアウトしました`);
}

/**
 * テーブルがACTIVE状態になるまで待機
 */
async function waitForTableActive(dynamoClient: DynamoDBClient, tableName: string): Promise<void> {
  let attempts = 0;
  const maxAttempts = 30; // 最大30秒待機
  
  while (attempts < maxAttempts) {
    try {
      const result = await dynamoClient.send(new DescribeTableCommand({ TableName: tableName }));
      if (result.Table?.TableStatus === 'ACTIVE') {
        return; // ACTIVE状態になった
      }
    } catch (error) {
      // テーブルがまだ作成中の場合はエラーになることがある
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000)); // 1秒待機
    attempts++;
  }
  
  throw new Error(`テーブル ${tableName} がACTIVE状態になるのがタイムアウトしました`);
}

/**
 * 指定したテーブルをクリーンアップ（削除→再作成）
 */
export async function cleanUP(tableName: TableName): Promise<void> {
  if (TABLE_NAMES.indexOf(tableName) === -1) {
    throw new Error(`Unknown table name: ${tableName}`);
  }

  const dynamoClient = getDynamoDBClient();
  
  try {    
    // テーブルの削除
    const exists = await tableExists(dynamoClient, tableName);
    if (exists) {
      await dynamoClient.send(new DeleteTableCommand({ TableName: tableName }));
      await waitForTableDeletion(dynamoClient, tableName);
    } else {
      console.log(`ℹ️  ${tableName} は存在しません`);
    }
    
    // テーブルのスキーマに基づいて再作成
    const schema:CreateTableCommandInput = TABLE_SCHEMAS[tableName];
    await dynamoClient.send(new CreateTableCommand(schema));
    await waitForTableActive(dynamoClient, tableName);
    
  } catch (error) {
    console.error(`❌ ${tableName} のクリーンアップに失敗:`, error);
    throw error;
  } finally {
    dynamoClient.destroy();
  }
}

/**
 * 全テーブルをクリーンアップ
 */
export async function cleanUpAllTables(): Promise<void> {
  for (const tableName of TABLE_NAMES) {
    await cleanUP(tableName);
  }
}

/**
 * DynamoDB Localのヘルスチェック
 */
export async function healthCheck(): Promise<boolean> {
  const dynamoClient = getDynamoDBClient();
  
  try {
    const { ListTablesCommand } = await import('../../../functions/counter-function/node_modules/@aws-sdk/client-dynamodb');
    await dynamoClient.send(new ListTablesCommand({}));
    return true;
  } catch (error) {
    console.error(`❌ DynamoDB Local health check failed: ${error}`);
    return false;
  } finally {
    dynamoClient.destroy();
  }
}