// dynamoClient.ts
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

export function createDocClient() {
  const isTest = process.env.JEST_WORKER_ID !== undefined;
  const useLocal = process.env.AWS_SAM_LOCAL === "1" || isTest;

  const config = useLocal
    ? {
        endpoint: "http://localhost:8000",
        region: "ap-northeast-1",
        credentials: {
          accessKeyId: "dummy",
          secretAccessKey: "dummy",
        },
      }
    : { region: "ap-northeast-1" };

  const base = new DynamoDBClient(config);
  return DynamoDBDocumentClient.from(base);
}