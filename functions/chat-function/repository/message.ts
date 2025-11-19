import {
  PutCommand,
  PutCommandInput,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";
import { AbstractDynamoDB } from "./dynamo_db";

export type MessageItem = {
  MessageNo: number;
  UserId: string;
  Content: string;
  CreatedAt: number; // Unix timestamp
  Dummy?: string;
};

export class MessageRepository extends AbstractDynamoDB {
  tableName = process.env.MESSAGE_TABLE || "MessageTable";

  /** メッセージ登録 */
  async putMessage(
    item: Omit<MessageItem, "MessageNo" | "Dummy" | "CreatedAt">,
    messageNo: number
  ) {
    const params: PutCommandInput = {
      TableName: this.tableName,
      Item: {
        ...item,
        MessageNo: messageNo,
        CreatedAt: Math.floor(Date.now() / 1000), // Unix timestamp
        Dummy: "ALL",
      } satisfies MessageItem,
    };

    const command = new PutCommand(params);
    return this.docClient.send(command);
  }

  /**
   * ページ単位で取得
   * MessageNo BETWEEN low AND high
   */
  async getMessagesByPage(page: number, perPage: number, max: number) {
    if (page < 1) throw new Error("page must be >= 1");
    if (perPage < 1) throw new Error("perPage must be >= 1");
    if (max < 0) throw new Error("max must be >= 0");
    if (max < (page - 1) * perPage + 1) return []; // 取得範囲外

    const high = Math.max(max - (page - 1) * perPage, 1); // そのページで最も大きい MessageNo
    const low = Math.max(high - perPage + 1, 1); // そのページで最も小さい MessageNo

    if (low > high) return [];

    const command = new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression:
        "Dummy = :dummy AND MessageNo BETWEEN :low AND :high",
      ExpressionAttributeValues: {
        ":dummy": "ALL",
        ":low": low,
        ":high": high,
      },
      ScanIndexForward: false, // 降順
      ConsistentRead: false,
    });

    const result = await this.docClient.send(command);
    return (result.Items ?? []) as MessageItem[];
  }
  /**
   * @var last 前回取得した最新の MessageNo
   * @var max 現在の最新の MessageNo
   * @var limit 取得上限（デフォルト100件）
   */
  /** lastから最新まで全て取得 */ //
  async getMessagesFromLast(
    last: number,
    max: number,
    limit: number = 100
  ): Promise<{ data: MessageItem[]; isGetAll: boolean }> {
    if (last >= max) return { data: [], isGetAll: true };
    if (last < 0) throw new Error("last must be >= 0");
    if (max < 0) throw new Error("max must be >= 0");
    if (limit < 1) throw new Error("limit must be >= 1");

    // 取得件数を制限
    const count = Math.min(max - last, limit);
    const high = last + count;

    const command = new QueryCommand({
      TableName: this.tableName,
      KeyConditionExpression:
        "Dummy = :dummy AND MessageNo BETWEEN :low AND :high",
      ExpressionAttributeValues: {
        ":dummy": "ALL",
        ":low": last + 1, // last より新しいもの
        ":high": high, // 上限
      },
      ScanIndexForward: true, // 昇順で取得（古い→新しい）
    });

    const result = await this.docClient.send(command);
    return {
      data: (result.Items ?? []) as MessageItem[],
      isGetAll: count === max - last,
    };
  }

  /** 指定期間のメッセージを取得 */
  async getMessagesFromTimeStampRange(
    startTimestamp: number,
    endTimestamp: number
  ): Promise<MessageItem[]> {
    if (startTimestamp > endTimestamp) {
      throw new Error("startTimestamp must be <= endTimestamp");
    }

    const command = new QueryCommand({
      TableName: this.tableName,
      IndexName: "CreatedAtIndex", // GSI を明示的に指定
      KeyConditionExpression:
        "Dummy = :dummy AND CreatedAt BETWEEN :low AND :high",
      ExpressionAttributeValues: {
        ":dummy": "ALL",
        ":low": startTimestamp,
        ":high": endTimestamp,
      },
      ScanIndexForward: true, // 昇順（古い→新しい）
    });

    const result = await this.docClient.send(command);
    return (result.Items ?? []) as MessageItem[];
  }
}
