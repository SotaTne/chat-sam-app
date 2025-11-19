import { createDocClient } from "../repository/dynamo_db";
import { MessageRepository } from "../repository/message";
import { MessageCounterRepository } from "../repository/message-counter";

const docClient = createDocClient();

const messageCounterRepository = new MessageCounterRepository(docClient);
const messageRepository = new MessageRepository(docClient);

export async function GetMessageLast({ lastNumber }: { lastNumber: number }) {
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
