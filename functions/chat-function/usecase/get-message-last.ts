import { MessageRepository } from "../repository/message";
import { MessageCounterRepository } from "../repository/message-counter";

export async function GetMessageLast({ lastNumber }: { lastNumber: number }) {
  const messageRepository = new MessageRepository();
  const messageCounterRepository = new MessageCounterRepository();
  let maxCount: number;
  try {
    maxCount = await messageCounterRepository.getCurrent();
  } catch (e) {
    console.error("Failed to get current message count", e);
    throw e;
  }
  try {
    const result = await messageRepository.getMessagesFromLast(
      lastNumber,
      maxCount
    );
    return result;
  } catch (e) {
    console.error("Failed to put message", e);
    throw e;
  }
}
