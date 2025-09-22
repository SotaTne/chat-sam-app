import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

const THREE_DAY_SECONDS = 259200;

export function getSession(event: APIGatewayProxyEvent): string | undefined {
  const header = event.headers;
  const cookieHeader = header["Cookie"] || header["cookie"];

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

  const maxAgeSeconds = options?.maxAgeSeconds || THREE_DAY_SECONDS;

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
