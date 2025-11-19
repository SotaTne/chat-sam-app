import { createDocClient } from "../repository/dynamo_db";
import { MessageRepository } from "../repository/message";
import { MessageCounterRepository } from "../repository/message-counter";

const docClient = createDocClient();

const messageCounterRepository = new MessageCounterRepository(docClient);
const messageRepository = new MessageRepository(docClient);

export async function GetMessagePaging({
  page,
  perPage,
}: {
  page: number;
  perPage: number;
}) {

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
