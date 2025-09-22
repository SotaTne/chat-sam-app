// GET messages/ -> JSON
// GET messages?page={number}&limit={number} -> JSON

import { APIGatewayProxyResult } from "aws-lambda";
import { handlerArgs } from "../config";

export function getMessagesHandler(args: handlerArgs): APIGatewayProxyResult {}
