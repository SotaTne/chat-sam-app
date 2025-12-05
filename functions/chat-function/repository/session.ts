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
  private readonly tableName: string;

  constructor(private readonly docClient: DynamoDBDocumentClient) {
    this.tableName = process.env.SESSION_TABLE || "chat-sam-app-SessionTable";
  }

  /** sessionId を新規作成 or 更新 */
  async upsertSession(item: SessionItem): Promise<void> {
    if (!item.SessionId || item.SessionId.trim() === "") {
      throw new Error("SessionId cannot be empty");
    }

    const command = new PutCommand({
      TableName: this.tableName,
      Item: {
        ...item,
        ExpirationDate: Math.floor(item.ExpirationDate.getTime() / 1000), // Unix timestamp (秒)
      },
    });

    try {
      await this.docClient.send(command);
    } catch (error) {
      console.error("Error upserting session:", error);
      throw error;
    }
  }

  /** sessionId からセッション情報を取得 */
  async getSession(sessionId: string): Promise<SessionItem | undefined> {
    if (!sessionId || sessionId.trim() === "") {
      throw new Error("SessionId cannot be empty");
    }

    const command = new GetCommand({
      TableName: this.tableName,
      Key: { SessionId: sessionId },
    });

    try {
      const data = await this.docClient.send(command);
      if (!data.Item) return undefined;

      const { ExpirationDate, ...rest } = data.Item as {
        ExpirationDate: number;
        [key: string]: any;
      };

      return {
        ...rest,
        SessionId: rest.SessionId,
        ExpirationDate: new Date(ExpirationDate * 1000),
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
