import { MessageRepository } from "../repository/message";
import { MessageCounterRepository } from "../repository/message-counter";

export async function GetMessagePaging({
  page,
  perPage,
}: {
  page: number;
  perPage: number;
}) {
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
    const messages = await messageRepository.getMessagesByPage(
      page,
      perPage,
      maxCount
    );
    return messages;
  } catch (e) {
    console.error("Failed to put message", e);
    throw e;
  }
}
