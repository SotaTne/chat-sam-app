import { createDocClient } from "../repository/dynamo_db";
import { MessageItem, MessageRepository } from "../repository/message";
import {
  type MessageRangeItems,
  MessageRangeRepository,
} from "../repository/message-range";

type RangeMessage = {
  range: MessageRangeItems;
  messages: MessageItem[];
};

const docClient = createDocClient();
const messageRepository = new MessageRepository(docClient);
const messageRangeRepository = new MessageRangeRepository(docClient);

export async function GetCounter(): Promise<RangeMessage[]> {
  const ranges: MessageRangeItems[] =
    await messageRangeRepository.getAllCounters();
  const result: RangeMessage[] = [];

  for (const range of ranges) {
    const messages: MessageItem[] =
      await messageRepository.getMessagesFromTimeStampRange(
        range.Start,
        range.End
      );
    result.push({ range, messages });
  }

  return result;
}
