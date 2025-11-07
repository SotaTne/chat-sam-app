import { MessageRangeRepository } from "../repository/message-range";

export async function GetCollectInfo() {
  const messageRangeRepository = new MessageRangeRepository();
  try {
    const info = await messageRangeRepository.getAllCounters();
    return info;
  } catch (e) {
    console.error("Failed to get collect info", e);
    throw e;
  }
}
