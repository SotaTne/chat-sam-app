import { Context } from "aws-lambda";
import { saveMessageRange } from "./usecase/save-message-range";

export async function lambdaHandler(event: any, context: Context) {
  console.log("Starting message range collection", {
    requestId: context.awsRequestId,
    event,
  });

  try {
    const result = await saveMessageRange();

    return {
      statusCode: 200,
      success: true,
      data: result, // 集計結果を含める
      timestamp: new Date().toISOString(),
      executionTime: Date.now() - (event.startTime || Date.now()),
    };
  } catch (error) {
    if (error instanceof Error) {
      // Step Functions にエラー情報を渡す
      return {
        statusCode: 500,
        success: false,
        error: {
          message: error.message,
          type: error.constructor.name,
        },
        timestamp: new Date().toISOString(),
      };
    } else {
      return {
        statusCode: 500,
        success: false,
        error: {
          message: "Unknown error occurred",
        },
        timestamp: new Date().toISOString(),
      };
    }
  }
}
