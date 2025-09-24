import { MessageCollectionRepository } from "../repository/message-collector";

export async function GetCollectInfo() {
  const messageCollectionRepository = new MessageCollectionRepository();
  try {
    const info = await messageCollectionRepository.getAllCounters();
    return info;
  } catch (e) {
    console.error("Failed to get collect info", e);
    throw e;
  }
}
