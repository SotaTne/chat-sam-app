import { MessageItem, MessageRepository } from "../repository/message";
import {
  type MessageRangeItems,
  MessageRangeRepository,
} from "../repository/message-range";

type RangeMessage = {
  range: MessageRangeItems;
  messages: MessageItem[];
};

export async function GetCounter(): Promise<RangeMessage[]> {
  const messageRepository = new MessageRepository();
  const messageRangeRepository = new MessageRangeRepository();
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
