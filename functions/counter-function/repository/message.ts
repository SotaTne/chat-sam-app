import { QueryCommand } from "@aws-sdk/lib-dynamodb";
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
