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
  //GENERATED_MESSAGE_GET,
  COUNTER_GET,
} from "./config";
import { getMessagesLastHandler } from "./router/get-messages-last";
import { postMessageHandler } from "./router/post-messages";
import { getMessagesHandler } from "./router/get-messages";
import { getIndexHandler } from "./router";
import { GetSessionByRepository } from "./usecase/get-session";
import { UpdateSession } from "./usecase/update-session";
import { CreateSession } from "./usecase/create-session";
//import { getGeneratedMessageHandler } from "./router/get-generated-messages";

export async function lambdaHandler(
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> {
  const path = event.path;
  const params = event.queryStringParameters;
  // const header = event.headers;
  const body: Response = JSON.parse(event.body || "null") || null;

  const method = event.httpMethod;

  console.log("path:", path);
  console.log("method:", event.httpMethod);

  const sessionId = getSession(event);

  let response: APIGatewayProxyResult = {} as APIGatewayProxyResult;

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
        const session = GetSessionByRepository(sessionId);
        if (!session) {
          needSetCookie = true;
          const sessionId = await CreateSession();
          userSessionId = sessionId;
        } else {
          await UpdateSession(sessionId);
          userSessionId = sessionId;
        }
      } else {
        // sessionIdを発行してSet-Cookieする
        const sessionId = await CreateSession();
        userSessionId = sessionId;
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
    const result = await handlePath<
      handlerArgs,
      APIGatewayProxyResult | Promise<APIGatewayProxyResult>
    >(
      method,
      path,
      [
        { fn: getIndexHandler, ...INDEX_GET },
        { fn: getMessagesHandler, ...MESSAGES_GET },
        { fn: getMessagesLastHandler, ...MESSAGES_LATEST_GET },
        { fn: postMessageHandler, ...MESSAGES_POST },
        { fn: getMessagesHandler, ...COUNTER_GET },
        //{ fn: getGeneratedMessageHandler, ...GENERATED_MESSAGE_GET },
      ],
      { params, sessionId: userSessionId, body }
    );
    if (result) {
      response = result;
      if (needSetCookie) {
        return setSessionId(response, userSessionId!);
      } else {
        return response;
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
