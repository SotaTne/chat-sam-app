import { defaultExpirationSeconds } from "../config";
import { SessionRepository } from "../repository/session";

export async function UpdateSession(sessionId: string) {
  const sessionRepository = new SessionRepository();
  sessionRepository.upsertSession({
    SessionId: sessionId,
    ExpirationDate: new Date(Date.now() + 1000 * defaultExpirationSeconds), // 3日後
  });
}
