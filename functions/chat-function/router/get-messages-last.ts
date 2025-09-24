// GET message/last -> JSON
// GET message/last?after={number(index)} -> JSON

import { APIGatewayProxyResult } from "aws-lambda";
import { handlerArgs } from "../config";
import { GetMessageLast } from "../usecase/get-message-last";

export async function getMessagesLastHandler(
  args: handlerArgs
): Promise<APIGatewayProxyResult> {
  let parsedLastNumber: number;
  if (!args.params || !args.params.lastNumber) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "lastNumber is required" }),
    };
  }
  if (isNaN(parseInt(args.params.lastNumber))) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: "lastNumber must be a number" }),
    };
  } else {
    parsedLastNumber = parseInt(args.params.lastNumber);
  }
  const result = await GetMessageLast({
    lastNumber: parsedLastNumber,
  });
  return {
    statusCode: 200,
    body: JSON.stringify(result),
  };
}
