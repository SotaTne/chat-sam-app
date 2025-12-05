import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

export type MessageRangeItems = {
  RecordId: string; // HASHキー
  Start: number; // 集計期間開始タイムスタンプ
  End: number; // 集計期間終了タイムスタンプ
  MessageCount: number; // 投稿件数
  UserCount: number; // ユニークユーザー数
  CreatedAt: number; // レコード作成日時（TTL）
  ExpirationDate: Date; // レコード有効期限（TTL）
};

export class MessageRangeRepository {
  private readonly tableName: string;

  constructor(private readonly docClient: DynamoDBDocumentClient) {
    this.tableName =
      process.env.COUNTER_RANGE_TABLE || "chat-sam-app-CounterRangeTable";
  }

  /** 集計データを保存 */
  async saveCounter(item: MessageRangeItems) {
    const command = new PutCommand({
      TableName: this.tableName,
      Item: {
        ...item,
        ExpirationDate: Math.floor(item.ExpirationDate.getTime() / 1000),
      },
    });
    await this.docClient.send(command);
  }

  // /** 全ての集計データを取得 */
  // async getAllCounters() {
  //   const command = new ScanCommand({
  //     TableName: this.tableName,
  //   });
  //   const result = await this.docClient.send(command);

  //   const data = (result.Items ?? []) as Array<
  //     Omit<CounterRangeItem, "ExpirationDate"> & { ExpirationDate: number }
  //   >;
  //   return data.map((item) => ({
  //     ...item,
  //     ExpirationDate: new Date(item.ExpirationDate * 1000),
  //   }));
  // }
}
