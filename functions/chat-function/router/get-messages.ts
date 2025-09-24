// GET messages/ -> JSON
// GET messages?page={number}&limit={number} -> JSON

import { APIGatewayProxyResult } from "aws-lambda";
import { handlerArgs } from "../config";
import { GetMessagePaging } from "../usecase/get-message-paging";

export async function getMessagesHandler(
  args: handlerArgs
): Promise<APIGatewayProxyResult> {
  const { params } = args;
  const page = params?.page ? parseInt(params.page) : 1;
  const perPage = params?.perPage ? parseInt(params.perPage) : 20;
  const result = await GetMessagePaging({
    page,
    perPage,
  });
  return {
    statusCode: 200,
    body: JSON.stringify(result),
  };
}
