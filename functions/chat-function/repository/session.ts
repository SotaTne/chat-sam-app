import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  // DeleteCommand,
} from "@aws-sdk/lib-dynamodb";

export interface SessionItem {
  SessionId: string;
  ExpirationDate: Date;
}

export class SessionRepository {
  private client: DynamoDBClient;
  private docClient: DynamoDBDocumentClient;
  private tableName = process.env.SESSION_TABLE || "SessionTable";

  constructor() {
    this.client = new DynamoDBClient({ region: "ap-northeast-1" });
    this.docClient = DynamoDBDocumentClient.from(this.client);
  }

  /** sessionId を新規作成 or 更新 */
  async upsertSession(item: SessionItem) {
    const command = new PutCommand({
      TableName: this.tableName,
      Item: {
        ...item,
        ExpirationDate: item.ExpirationDate.toISOString(),
      },
    });

    try {
      return await this.docClient.send(command);
    } catch (error) {
      console.error("Error upserting session:", error);
      throw error;
    }
  }

  /** sessionId からセッション情報を取得 */
  async getSession(sessionId: string): Promise<SessionItem | undefined> {
    const command = new GetCommand({
      TableName: this.tableName,
      Key: { SessionId: sessionId },
    });

    try {
      const data = await this.docClient.send(command);
      if (!data.Item) return undefined;

      return {
        ...data.Item,
        ExpirationDate: new Date(data.Item.ExpirationDate),
      } as SessionItem;
    } catch (error) {
      console.error("Error getting session:", error);
      throw error;
    }
  }

  // /** sessionId を削除 */
  // async deleteSession(sessionId: string) {
  //   const command = new DeleteCommand({
  //     TableName: this.tableName,
  //     Key: { SessionId: sessionId },
  //   });

  //   try {
  //     return await this.docClient.send(command);
  //   } catch (error) {
  //     console.error("Error deleting session:", error);
  //     throw error;
  //   }
  // }
}
