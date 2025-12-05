// tests/integration/chat-function/utils/db.ts
import {
  DynamoDBClient,
  CreateTableCommand,
  DeleteTableCommand,
  PutItemCommand,
  ScanCommand,
  CreateTableCommandInput,
  DescribeTableCommand,
  ListTablesCommand,
} from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

export type TableDump = {
  tableName: string;
  schema: CreateTableCommandInput;
  dataFiles: string[];
};

// DynamoDB クライアント作成
export function createDynamoClient(): DynamoDBClient {
  return new DynamoDBClient({
    endpoint: "http://localhost:8000",
    region: "ap-northeast-1",
    credentials: { accessKeyId: "dummy", secretAccessKey: "dummy" },
  });
}

// DynamoDB Document クライアント作成
export function createDocumentClient(): DynamoDBDocumentClient {
  return DynamoDBDocumentClient.from(createDynamoClient());
}

export async function listTableDumps(rootDir: string): Promise<TableDump[]> {
  const entries = await readdir(rootDir, { withFileTypes: true });
  const results: TableDump[] = [];

  for (const e of entries) {
    if (!e.isDirectory()) continue;
    const tableName = e.name;
    const tableDir = join(rootDir, tableName);
    const schemaPath = join(tableDir, "schema.json");
    const dataDir = join(tableDir, "data");

    let schema: CreateTableCommandInput;
    try {
      const buf = await readFile(schemaPath, "utf-8");
      const rawSchema = JSON.parse(buf);

      // DynamoDB dumpファイルの場合、Tableオブジェクト内にスキーマがネストされている
      if (rawSchema.Table) {
        const tableInfo = rawSchema.Table;
        schema = {
          TableName: tableInfo.TableName,
          AttributeDefinitions: tableInfo.AttributeDefinitions,
          KeySchema: tableInfo.KeySchema,
          BillingMode: "PAY_PER_REQUEST", // ローカル環境では簡単にするため
        };

        // GSIがあれば追加
        if (tableInfo.GlobalSecondaryIndexes) {
          schema.GlobalSecondaryIndexes = tableInfo.GlobalSecondaryIndexes.map(
            (gsi: any) => ({
              IndexName: gsi.IndexName,
              KeySchema: gsi.KeySchema,
              Projection: gsi.Projection || { ProjectionType: "ALL" },
            })
          );
        }
      } else {
        schema = rawSchema as CreateTableCommandInput;
      }
    } catch (err) {
      console.warn(`⚠️ schema.json が読めません ${schemaPath}`, err);
      continue;
    }

    let dataFiles: string[] = [];
    try {
      const df = await readdir(dataDir);
      dataFiles = df
        .filter((f) => f.endsWith(".json"))
        .map((f) => join(dataDir, f));
    } catch {
      // data フォルダがなければ空データ
    }

    results.push({ tableName, schema, dataFiles });
  }

  return results;
}

// テーブルが存在するかチェック
export async function tableExists(
  client: DynamoDBClient,
  tableName: string
): Promise<boolean> {
  try {
    await client.send(new DescribeTableCommand({ TableName: tableName }));
    return true;
  } catch {
    return false;
  }
}

// すべてのテーブルを削除
export async function cleanupAllTables(client: DynamoDBClient): Promise<void> {
  try {
    const listResult = await client.send(new ListTablesCommand({}));
    const tableNames = listResult.TableNames || [];

    for (const tableName of tableNames) {
      try {
        console.log("Deleting table:", tableName);
        await client.send(new DeleteTableCommand({ TableName: tableName }));
      } catch (err) {
        console.warn(`⚠️ テーブル削除に失敗しました: ${tableName}`, err);
      }
    }
  } catch (err) {
    console.warn("⚠️ テーブル一覧取得に失敗しました", err);
  }
}

/** DynamoDB Local にテーブル作成 + fixture データ投入 */
export async function setupFromDump(
  rootDir = join(process.cwd(), "docker", "dynamodb", "dump"),
  existingClient?: DynamoDBClient
): Promise<DynamoDBClient> {
  const client = existingClient || createDynamoClient();

  const tableDumps = await listTableDumps(rootDir);

  // 既存テーブルをクリーンアップ
  await cleanupAllTables(client);

  // テーブル作成
  for (const tbl of tableDumps) {
    console.log("Creating table:", tbl.tableName);
    await client.send(new CreateTableCommand(tbl.schema));
  }

  // データ投入
  for (const tbl of tableDumps) {
    for (const dataFile of tbl.dataFiles) {
      const buf = await readFile(dataFile, "utf-8");
      const rawData = JSON.parse(buf);

      // DynamoDB dumpファイルの場合、Itemsプロパティ内にアイテムが格納されている
      let items = rawData;
      if (rawData.Items && Array.isArray(rawData.Items)) {
        items = rawData.Items;
      }

      if (!Array.isArray(items)) {
        console.warn(`⚠️ データファイルが配列ではありません ${dataFile}`);
        continue;
      }

      console.log(`Inserting ${items.length} items into ${tbl.tableName}`);

      for (const item of items) {
        if (Object.keys(item).length > 0) {
          // 空のオブジェクトをスキップ
          await client.send(
            new PutItemCommand({
              TableName: tbl.tableName,
              Item: item, // 既にDynamoDB形式と仮定
            })
          );
        }
      }
    }
  }

  return client;
}

/** テーブルを削除してクリーンアップ */
export async function teardownDump(
  client: DynamoDBClient,
  rootDir = join(process.cwd(), "docker", "dynamodb", "dump")
): Promise<void> {
  await cleanupAllTables(client);
  client.destroy();
}

// ヘルスチェック関数
export async function healthCheck(client?: DynamoDBClient): Promise<boolean> {
  const testClient = client || createDynamoClient();
  try {
    await testClient.send(new ListTablesCommand({}));
    return true;
  } catch {
    return false;
  } finally {
    if (!client) {
      testClient.destroy();
    }
  }
}

/** 現在の DB 内容を全部読み出す (Scan) */
export async function dumpCurrentDB(
  client: DynamoDBClient,
  tableName: string
): Promise<any[]> {
  const { Items } = await client.send(
    new ScanCommand({ TableName: tableName })
  );
  if (!Items) return [];
  return Items.map((av) => unmarshall(av));
}
