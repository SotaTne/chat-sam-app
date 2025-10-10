import {
  GetCommand,
  GetCommandInput,
  UpdateCommand,
  UpdateCommandInput,
} from "@aws-sdk/lib-dynamodb";
import { AbstractDynamoDB } from "./dynamo_db";

export class MessageCounterRepository extends AbstractDynamoDB {
  tableName = process.env.MESSAGE_COUNTER_TABLE || "MessageCounterTable";
  private counterId = "MESSAGE_COUNTER"; // 常にこのキーを使う

  /** 次のMessageNoを取得してインクリメント */
  async nextMessageNo(): Promise<number> {
    const params: UpdateCommandInput = {
      TableName: this.tableName,
      Key: { CounterId: this.counterId },
      UpdateExpression: "SET #count = if_not_exists(#count, :start) + :inc",
      ExpressionAttributeNames: { "#count": "Count" },
      ExpressionAttributeValues: { ":inc": 1, ":start": 0 },
      ReturnValues: "UPDATED_NEW",
    };

    const result = await this.docClient.send(new UpdateCommand(params));
    return result.Attributes?.Count as number;
  }

  /** 現在のMessageNoを取得（インクリメントはしない） */
  async getCurrent(): Promise<number> {
    const params: GetCommandInput = {
      TableName: this.tableName,
      Key: { CounterId: this.counterId },
    };

    const result = await this.docClient.send(new GetCommand(params));
    return (result.Item?.Count as number) || 0;
  }
}
