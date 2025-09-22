import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import { getSession, setSessionId } from "./helper/cookie";
import {
  handlePath,
  handlerArgs,
  isPathMatch,
  MESSAGES_GET,
  MESSAGES_LATEST_GET,
  MESSAGES_POST,
  INDEX_GET,
} from "./config";
import { getMessagesLastHandler } from "./router/get-messages-last";
import { postMessageHandler } from "./router/post-messages";
import { getMessagesHandler } from "./router/get-messages";
import { getIndexHandler } from "./router";

export async function lambdaHandler(
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> {
  const path = event.path;
  const params = event.pathParameters;
  // const header = event.headers;
  const body = event.body;

  const method = event.httpMethod;
  const sessionId = getSession(event);

  const response: APIGatewayProxyResult = {} as any;

  const findPath = isPathMatch(method, path);

  let needSetCookie = false;

  let userSessionId: string;

  try {
    if (findPath) {
      // 必要であれば認証
      if (sessionId) {
        // sessionIdが存在するかの確認
        // 存在する場合は有効期限を伸ばす
        // 存在しない場合は新規発行してSet-Cookieする

        userSessionId = sessionId;
      } else {
        // sessionIdを発行してSet-Cookieする
        needSetCookie = true;
      }
    } else {
      return {
        statusCode: 404,
        body: "this page is undefined",
      } satisfies APIGatewayProxyResult;
    }
  } catch {
    return {
      statusCode: 500,
      body: "internal server error",
    } satisfies APIGatewayProxyResult;
  }

  try {
    // auth all
    const result = handlePath<handlerArgs, APIGatewayProxyResult>(
      method,
      path,
      [
        { fn: getIndexHandler, ...INDEX_GET },
        { fn: getMessagesHandler, ...MESSAGES_GET },
        { fn: getMessagesLastHandler, ...MESSAGES_LATEST_GET },
        { fn: postMessageHandler, ...MESSAGES_POST },
      ]
    );
    if (result) {
      if (needSetCookie) {
        return setSessionId(result, userSessionId!);
      } else {
        return result;
      }
    }
    return {
      statusCode: 404,
      body: "this page is undefined",
    } satisfies APIGatewayProxyResult;
  } catch {
    return {
      statusCode: 500,
      body: "internal server error",
    };
  }
}
