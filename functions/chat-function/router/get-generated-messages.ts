import { APIGatewayProxyResult } from "aws-lambda";
import { handlerArgs } from "../config";
import { GetGeneratedMessage } from "../usecase/get-generated-message";

export async function getGeneratedMessageHandler(
  args: handlerArgs
): Promise<APIGatewayProxyResult> {
  const generatedMessage = await GetGeneratedMessage();
  return {
    statusCode: 200,
    body: JSON.stringify({ message: generatedMessage }),
  } satisfies APIGatewayProxyResult;
}
