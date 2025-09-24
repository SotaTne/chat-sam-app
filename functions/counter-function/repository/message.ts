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

  async getMessagesFromTimeStamp(
    startTimestamp: number,
    endTimestamp: number
  ): Promise<MessageItem[]> {
    if (startTimestamp > endTimestamp) {
      throw new Error("startTimestamp must be <= endTimestamp");
    }
    const command = new QueryCommand({
      TableName: this.table_name,
      KeyConditionExpression:
        "Dummy = :dummy AND CreatedAt BETWEEN :low AND :high",
      ExpressionAttributeValues: {
        ":dummy": "ALL",
        ":low": startTimestamp,
        ":high": endTimestamp, // 上限
      },
      ScanIndexForward: true,
    });

    const result = await this.docClient.send(command);
    return {
      data: (result.Items ?? []) as MessageItem[],
      isGetAll: count === max - last,
    };
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
