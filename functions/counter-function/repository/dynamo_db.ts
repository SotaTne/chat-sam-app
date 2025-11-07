import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

// 継承される前提のクラス
export abstract class AbstractDynamoDB {
  client: DynamoDBClient;
  docClient: DynamoDBDocumentClient;
  abstract tableName: string;
  constructor() {
    const config = process.env.AWS_SAM_LOCAL
      ? {
          endpoint: "http://host.docker.internal:8000", // DynamoDB Local
          region: "ap-northeast-1",
          credentials: {
            accessKeyId: "dummy",
            secretAccessKey: "dummy",
          },
        }
      : { region: "ap-northeast-1" };
    this.client = new DynamoDBClient(config);
    this.docClient = DynamoDBDocumentClient.from(this.client);
  }
}
