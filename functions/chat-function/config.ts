import { APIGatewayProxyEventQueryStringParameters } from "aws-lambda";

export const RANDOM_KEY = "abcdefghijklnm";
export const defaultExpirationSeconds = 259200;

export type METHODS = "GET" | "POST" | "PUT" | "DELETE";

type PathConfig = {
  method: METHODS;
  path: RegExp;
};

export type handlerArgs = {
  params: APIGatewayProxyEventQueryStringParameters | null;
  sessionId: string;
  body: any | null;
};

export const INDEX_GET: PathConfig = { method: "GET", path: /^\/$/ };
export const MESSAGES_GET: PathConfig = {
  method: "GET",
  path: /^\/messages\/?$/,
};
export const MESSAGES_LATEST_GET: PathConfig = {
  method: "GET",
  path: /^\/messages\/latest\/?$/,
};
export const MESSAGES_POST: PathConfig = {
  method: "POST",
  path: /^\/messages\/?$/,
};
// export const GENERATED_MESSAGE_GET: PathConfig = {
//   method: "GET",
//   path: /^\/generated-message\/?$/,
// };
export const COUNTER_GET: PathConfig = {
  method: "GET",
  path: /^\/message-counter\/?$/,
};

export const PATHS: PathConfig[] = [
  INDEX_GET,
  MESSAGES_GET,
  MESSAGES_LATEST_GET,
  MESSAGES_POST,
  COUNTER_GET,
  // GENERATED_MESSAGE_GET,
];

export function isPathMatch(method: string, path: string) {
  return PATHS.some((p) => p.method === method && p.path.test(path));
}

export function handlePath<TArgs = any, TResult = any>(
  method: string,
  path: string,
  handlers: {
    path: RegExp;
    method: METHODS;
    fn: (args: TArgs) => TResult;
  }[],
  args: Omit<TArgs, "method" | "path"> = {} as Omit<TArgs, "method" | "path">
): TResult | undefined {
  const matched = handlers.find(
    (h) => h.method === method && h.path.test(path)
  );

  if (!matched) {
    return undefined; // マッチしない場合は undefined を返す
  }

  return matched.fn({
    method,
    path,
    ...args,
  } as TArgs);
}
