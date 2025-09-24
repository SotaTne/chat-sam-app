import { SessionRepository } from "../repository/session";

export async function GetSessionByRepository(sessionId: string) {
  const sessionRepository = new SessionRepository();
  try {
    const session = await sessionRepository.getSession(sessionId);
    return session;
  } catch (e) {
    console.error("Failed to get session", e);
    throw e;
  }
}
