import {
  PutCommand,
  GetCommand,
  // DeleteCommand,
} from "@aws-sdk/lib-dynamodb";
import { AbstractDynamoDB } from "./dynamo_db";

export interface SessionItem {
  SessionId: string;
  ExpirationDate: Date;
}

export class SessionRepository extends AbstractDynamoDB {
  tableName = process.env.SESSION_TABLE || "SessionTable";

  /** sessionId を新規作成 or 更新 */
  async upsertSession(item: SessionItem) {
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
    const command = new GetCommand({
      TableName: this.tableName,
      Key: { SessionId: sessionId },
    });

    try {
      const data = await this.docClient.send(command);
      if (!data.Item) return undefined;

      return {
        ...data.Item,
        ExpirationDate: new Date(data.Item.ExpirationDate * 1000), // 秒→ミリ秒変換を追加
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
