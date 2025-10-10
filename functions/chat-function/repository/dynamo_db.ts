import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

// 継承される前提のクラス
export abstract class AbstractDynamoDB {
  client: DynamoDBClient;
  docClient: DynamoDBDocumentClient;
  abstract tableName: string;
  constructor() {
    this.client = new DynamoDBClient({ region: "ap-northeast-1" });
    this.docClient = DynamoDBDocumentClient.from(this.client);
  }
}
