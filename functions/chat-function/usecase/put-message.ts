import { createDocClient } from "../repository/dynamo_db";
import { MessageRepository } from "../repository/message";
import { MessageCounterRepository } from "../repository/message-counter";

const docClient = createDocClient();
const messageRepository = new MessageRepository(docClient);
const messageCounterRepository = new MessageCounterRepository(docClient);

export async function PutMessage({
  UserId,
  Content,
}: {
  UserId: string;
  Content: string;
}) {
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
