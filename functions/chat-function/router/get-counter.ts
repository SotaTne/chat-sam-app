import { APIGatewayProxyResult } from "aws-lambda";
import { GetCounter } from "../usecase/get-counter";
import { handlerArgs } from "../config";

export async function getCounterHandler(
  args: handlerArgs
): Promise<APIGatewayProxyResult> {
  const ranges = await GetCounter();
  return {
    statusCode: 200,
    body: JSON.stringify(ranges),
  } satisfies APIGatewayProxyResult;
}
