import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  PutCommandInput,
  QueryCommand,
} from "@aws-sdk/lib-dynamodb";

export type MessageItem = {
  MessageNo: number;
  UserId: string;
  Content: string;
  CreatedAt: number; // Unix timestamp
  Dummy?: string;
};

export class MessageRepository {
  private client: DynamoDBClient;
  private docClient: DynamoDBDocumentClient;
  private table_name = process.env.MESSAGE_TABLE || "MessageTable";

  constructor() {
    this.client = new DynamoDBClient({ region: "ap-northeast-1" });
    this.docClient = DynamoDBDocumentClient.from(this.client);
  }

  /** メッセージ登録 */
  async putMessage(
    item: Omit<MessageItem, "MessageNo" | "Dummy">,
    messageNo: number
  ) {
    const params: PutCommandInput = {
      TableName: this.table_name,
      Item: {
        ...item,
        MessageNo: messageNo,
        Dummy: "ALL",
      },
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
    if (max < 1) throw new Error("max must be >= 1");

    const high = Math.max(max - (page - 1) * perPage, 1); // そのページで最も大きい MessageNo
    const low = Math.max(high - perPage + 1, 1); // そのページで最も小さい MessageNo

    if (low > high) return [];

    const command = new QueryCommand({
      TableName: this.table_name,
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
    return (result.Items || []) as MessageItem[];
  }

  // /** 単一メッセージ取得 */
  // async getMessageById(messageNo: number) {
  //   const command = new QueryCommand({
  //     TableName: "MessageTable",
  //     KeyConditionExpression: "Dummy = :dummy AND MessageNo = :no",
  //     ExpressionAttributeValues: {
  //       ":dummy": "ALL",
  //       ":no": messageNo,
  //     },
  //   });

  //   const result = await this.docClient.send(command);
  //   return result.Items?.[0] as MessageItem | undefined;
  // }
}
