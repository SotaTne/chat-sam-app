import { defaultExpirationSeconds } from "../config";
import { createDocClient } from "../repository/dynamo_db";
import { SessionRepository } from "../repository/session";

const docClient = createDocClient();
const sessionRepository = new SessionRepository(docClient);

export async function CreateSession(): Promise<string> {
  // UUID v4 を生成
  const sessionId = crypto.randomUUID();
  try {
    await sessionRepository.upsertSession({
      SessionId: sessionId,
      ExpirationDate: new Date(Date.now() + 1000 * defaultExpirationSeconds), // 3日後
    });
  } catch (e) {
    console.error("Failed to create session", e);
    throw e;
  }
  return sessionId;
}
