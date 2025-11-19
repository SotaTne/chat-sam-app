import { createDocClient } from "../repository/dynamo_db";
import { SessionRepository } from "../repository/session";

const docClient = createDocClient();
const sessionRepository = new SessionRepository(docClient);

export async function GetSessionByRepository(sessionId: string) {
  try {
    const session = await sessionRepository.getSession(sessionId);
    return session;
  } catch (e) {
    console.error("Failed to get session", e);
    throw e;
  }
}
