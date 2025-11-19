import { ScanCommand } from "@aws-sdk/lib-dynamodb";
import { AbstractDynamoDB } from "./dynamo_db";

export type MessageRangeItems = {
  RecordId: string; // HASHキー
  Start: number; // 集計期間開始タイムスタンプ
  End: number; // 集計期間終了タイムスタンプ
  MessageCount: number; // 投稿件数
  UserCount: number; // ユニークユーザー数
  CreatedAt: number; // レコード作成日時（TTL）
  ExpirationDate: Date; // レコード有効期限（TTL）
};

export class MessageRangeRepository extends AbstractDynamoDB {
  tableName = process.env.COUNTER_RANGE_TABLE || "CounterRangeTable";

  /** 全ての集計データを取得 */
  async getAllCounters() {
    const command = new ScanCommand({
      TableName: this.tableName,
    });
    const result = await this.docClient.send(command);

    const data = (result.Items ?? []) as Array<
      Omit<MessageRangeItems, "ExpirationDate"> & { ExpirationDate: number }
    >;
    const transformedData: MessageRangeItems[] = data.map((item) => ({
      ...item,
      ExpirationDate: new Date(item.ExpirationDate * 1000),
    }));
    return transformedData;
  }
}
