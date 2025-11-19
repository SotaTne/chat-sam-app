import { createDocClient } from "../repository/dynamo_db";
import { MessageRangeRepository } from "../repository/message-range";

const docClient = createDocClient();
const messageRangeRepository = new MessageRangeRepository(docClient);

export async function GetCollectInfo() {
  try {
    const info = await messageRangeRepository.getAllCounters();
    return info;
  } catch (e) {
    console.error("Failed to get collect info", e);
    throw e;
  }
}
