import { defaultExpirationSeconds } from "../config";
import { SessionRepository } from "../repository/session";

export async function CreateSession(): Promise<string> {
  // UUID v4 を生成
  const sessionId = crypto.randomUUID();
  const sessionRepository = new SessionRepository();
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
