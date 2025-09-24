import { Context } from "aws-lambda";

export function lambdaHandler(event: Object, context: Context) {
  const callTime = new Date().toISOString();
}
