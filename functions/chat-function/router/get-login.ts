import { APIGatewayProxyResult } from "aws-lambda";
import { handlerArgs } from "../config";

export async function getLoginHandler(
  args: handlerArgs
): Promise<APIGatewayProxyResult> {}
