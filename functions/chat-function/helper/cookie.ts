import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { defaultExpirationSeconds } from "../config";

export function getSession(event: APIGatewayProxyEvent): string | undefined {
  const header = event.headers;
  let cookieHeader: string | undefined;
  if (!header) return undefined;
  if ("Cookie" in header === false && "cookie" in header === false) {
    return undefined;
  } else if ("Cookie" in header) {
    cookieHeader = header["Cookie"];
  } else if ("cookie" in header) {
    cookieHeader = header["cookie"];
  }

  if (!cookieHeader) return undefined;

  const cookies = cookieHeader.split(";").reduce((acc, pair) => {
    const [key, value] = pair.trim().split("=");
    acc[key] = value;
    return acc;
  }, {} as Record<string, string>);
  return cookies["sessionId"];
}

export function setSessionId(
  result: APIGatewayProxyResult,
  sessionId: string,
  options?: { maxAgeSeconds?: number }
): APIGatewayProxyResult {
  const cookieParts = [`sessionId=${sessionId}`];

  const maxAgeSeconds = options?.maxAgeSeconds || defaultExpirationSeconds;

  cookieParts.push(`Max-Age=${maxAgeSeconds}`);
  cookieParts.push("HttpOnly", "Secure", "SameSite=Strict", "Path=/");

  return {
    multiValueHeaders: {
      "Set-Cookie": [cookieParts.join("; ")],
      ...result.multiValueHeaders,
    },
    ...result,
  };
}
