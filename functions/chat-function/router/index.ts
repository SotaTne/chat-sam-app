import { APIGatewayProxyResult } from "aws-lambda";
import { handlerArgs } from "../config";

// GET / -> HTML
export function getIndexHandler(args: handlerArgs): APIGatewayProxyResult {}
