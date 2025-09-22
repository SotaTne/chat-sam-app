import { MessageRepository } from "../repository/message";
import { MessageCounterRepository } from "../repository/message-counter";

export async function putMessage({
  UserId,
  Content,
}: {
  UserId: string;
  Content: string;
}) {
  const messageRepository = new MessageRepository();
  const messageCounterRepository = new MessageCounterRepository();
  let count: number;
  try {
    count = await messageCounterRepository.nextMessageNo();
  } catch (e) {
    console.error("Failed to get current message count", e);
    throw e;
  }
  try {
    await messageRepository.putMessage({ UserId, Content }, count);
  } catch (e) {
    console.error("Failed to put message", e);
    throw e;
  }
}
