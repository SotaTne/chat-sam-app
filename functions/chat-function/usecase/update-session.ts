import { defaultExpirationSeconds } from "../config";
import { createDocClient } from "../repository/dynamo_db";
import { SessionRepository } from "../repository/session";

const docClient = createDocClient();
const sessionRepository = new SessionRepository(docClient);

export async function UpdateSession(sessionId: string) {
  sessionRepository.upsertSession({
    SessionId: sessionId,
    ExpirationDate: new Date(Date.now() + 1000 * defaultExpirationSeconds), // 3日後
  });
}
