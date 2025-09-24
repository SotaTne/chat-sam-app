import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  //PutCommand,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";

export type GeneratedMessageItem = {
  GeneratedMessageId: string;
  Content: string;
  CreatedAt: number;
};

export class GeneratedMessageRepository {
  private client: DynamoDBClient;
  private docClient: DynamoDBDocumentClient;
  private tableName =
    process.env.GENERATED_MESSAGE_TABLE || "GeneratedMessageTable";

  constructor() {
    this.client = new DynamoDBClient({ region: "ap-northeast-1" });
    this.docClient = DynamoDBDocumentClient.from(this.client);
  }

  // /** メッセージ登録 */
  // async putMessage(
  //   item: Omit<GeneratedMessageItem, "GeneratedMessageId">,
  //   id: string
  // ) {
  //   const command = new PutCommand({
  //     TableName: this.tableName,
  //     Item: {
  //       ...item,
  //       GeneratedMessageId: id,
  //     },
  //   });
  //   return this.docClient.send(command);
  // }

  /** 作成日時で降順に取得（オプション: limit 指定可） */
  async getLatestMessages(limit: number = 100) {
    const command = new QueryCommand({
      TableName: this.tableName,
      IndexName: "CreatedAtIndex",
      KeyConditionExpression: "Dummy = :dummy",
      ExpressionAttributeValues: {
        ":dummy": "ALL",
      },
      ScanIndexForward: false, // 降順
      Limit: limit,
    });

    const result = await this.docClient.send(command);
    return (result.Items ?? []) as GeneratedMessageItem[];
  }
}
