// POST messages/ -> JSON

import { APIGatewayProxyResult } from "aws-lambda";
import { handlerArgs } from "../config";
import { PutMessage } from "../usecase/put-message";

export async function postMessageHandler(
  args: handlerArgs
): Promise<APIGatewayProxyResult> {
  const { body } = args;
  if (!body) {
    return {
      statusCode: 400,
      body: "Bad Request: body is required",
    } satisfies APIGatewayProxyResult;
  }
  if (typeof body !== "object" || Array.isArray(body)) {
    return {
      statusCode: 400,
      body: "Bad Request: body must be an object",
    } satisfies APIGatewayProxyResult;
  }
  if (
    !("contents" in body) ||
    typeof body.contents !== "string" ||
    body.contents === "" ||
    body.contents.length > 2048
  ) {
    return {
      statusCode: 400,
      body: "Bad Request: contents is required and must be a string <= 2048 characters",
    } satisfies APIGatewayProxyResult;
  }

  await PutMessage({
    UserId: args.sessionId,
    Content: body.contents,
  });

  return {
    statusCode: 200,
    body: JSON.stringify({ message: "Message posted successfully" }),
  } satisfies APIGatewayProxyResult;
}
