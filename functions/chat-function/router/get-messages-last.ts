// GET message/last -> JSON
// GET message/last?after={number(index)} -> JSON

import { APIGatewayProxyResult } from "aws-lambda";
import { handlerArgs } from "../config";

export function getMessagesLastHandler(
  args: handlerArgs
): APIGatewayProxyResult {}
