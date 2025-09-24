// import { APIGatewayProxyResult } from "aws-lambda";
// import { handlerArgs } from "../config";
// import { GetGeneratedMessage } from "../usecase/get-generated-message";

import { APIGatewayProxyResult } from "aws-lambda";
import { handlerArgs } from "../config";
import { GetCollectInfo } from "../usecase/get-collect-info";

export async function getMessageCollector(
  args: handlerArgs
): Promise<APIGatewayProxyResult> {
  const collectInfo = await GetCollectInfo();
  return {
    statusCode: 200,
    body: JSON.stringify({ info: collectInfo }),
  } satisfies APIGatewayProxyResult;
}
