import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

export type CounterRangeItem = {
  RecordId: string; // HASHキー
  Start: number; // 集計期間開始タイムスタンプ
  End: number; // 集計期間終了タイムスタンプ
  MessageCount: number; // 投稿件数
  UserCount: number; // ユニークユーザー数
  CreatedAt: number; // レコード作成日時（TTL）
};

export class MessageCollectionRepository {
  private client: DynamoDBClient;
  private docClient: DynamoDBDocumentClient;
  private tableName = process.env.COUNTER_RANGE_TABLE || "CounterRangeTable";

  constructor() {
    this.client = new DynamoDBClient({ region: "ap-northeast-1" });
    this.docClient = DynamoDBDocumentClient.from(this.client);
  }

  // /** 集計データを保存 */
  // async saveCounter(item: CounterRangeItem) {
  //   const command = new PutCommand({
  //     TableName: this.tableName,
  //     Item: item,
  //   });
  //   await this.docClient.send(command);
  // }

  /** 全ての集計データを取得（必要なら範囲でフィルタ可能） */
  async getAllCounters() {
    const command = new ScanCommand({
      TableName: this.tableName,
    });
    const result = await this.docClient.send(command);
    return (result.Items ?? []) as CounterRangeItem[];
  }
}
