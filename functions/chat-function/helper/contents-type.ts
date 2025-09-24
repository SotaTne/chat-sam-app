import { APIGatewayProxyResult } from "aws-lambda";

type ContentsType =
  | "text/html"
  | "application/javascript"
  | "text/css"
  | "application/json"
  | "text/plain";

export function setContentsType(
  result: APIGatewayProxyResult,
  contentType: ContentsType
): APIGatewayProxyResult {
  return {
    ...result,
    headers: {
      ...result.headers,
      "Content-Type": contentType + "; charset=utf-8",
    },
  };
}
