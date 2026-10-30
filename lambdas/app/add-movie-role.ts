import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import { actorKey, ddb, movieKey, type Role, tableName } from "../shared/db";
import { isResponse, parseJsonObject, response } from "../shared/http";

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const body = parseJsonObject(event);
  if (isResponse(body)) return body;

// check that the movie ID and actor ID are positive integers, if its a 400 response it explains why
if (
  typeof body.movieId !== "number" ||
  !Number.isSafeInteger(body.movieId) ||
  body.movieId <= 0 ||
  typeof body.actorId !== "number" ||
  !Number.isSafeInteger(body.actorId) ||
  body.actorId <= 0
) {
  return response(400, {
    message: "Movie and actor ID's must be positive integers"
  });
}


// then this checks that the role name and description are provided and if not returns 400 response with message
if (
  typeof body.roleName !== "string" ||
  !body.roleName.trim() ||
  typeof body.roleDescription !== "string" ||
  !body.roleDescription.trim()
) {
  return response(400, {
    message: "Role name and description are required"
  });
}








  const role: Role = {
    movieId: body.movieId as number,
    actorId: body.actorId as number,
    roleName: body.roleName as string,
    roleDescription: body.roleDescription as string,
  };

  try {
    //  TOD∏O - Add role if its IDs are valid
    return response(201, { message: "Role added", data: role });
  } catch (err) {
    console.error("DynamoDB error:", err);
    return response(500, {
      message: "Internal server error",
      error: err,
    });
  }
};
