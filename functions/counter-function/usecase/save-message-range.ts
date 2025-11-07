import { defaultExpirationSeconds } from "../config";
import { MessageRepository } from "../repository/message";
import {
  MessageRangeRepository,
  type MessageRangeItems,
} from "../repository/message-range";

export async function saveMessageRange() {
  const messageRangeRepository = new MessageRangeRepository();
  const messageRepository = new MessageRepository();
  const now = Math.floor(Date.now() / 1000); // 現在時刻（Unix timestamp 秒）
  const sixHoursAgo = now - 6 * 60 * 60; // 6時間前（秒）

  const startTimeStampSecond = sixHoursAgo;
  const endTimeStampSecond = now;
  const messages = await messageRepository.getMessagesFromTimeStampRange(
    startTimeStampSecond,
    endTimeStampSecond
  );

  let userCount = 0;

  const userSet = new Set<string>();
  messages.forEach((msg) => {
    userSet.add(msg.UserId);
  });
  userCount = userSet.size;

  const createdAtDate = new Date();

  const counterRangeItem: MessageRangeItems = {
    RecordId: `hourly-${createdAtDate.toISOString().slice(0, 13)}`, // "hourly-2024-01-15T12"
    Start: startTimeStampSecond,
    End: endTimeStampSecond,
    MessageCount: messages.length,
    UserCount: userCount,
    CreatedAt: createdAtDate.getTime() / 1000, // Unix timestamp 秒
    ExpirationDate: new Date(now + defaultExpirationSeconds * 1000),
  };

  await messageRangeRepository.saveCounter(counterRangeItem);
}
