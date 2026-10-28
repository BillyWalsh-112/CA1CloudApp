import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import {
  actorKey,
  ddb,
  isRoleItem,
  movieKey,
  parseId,
  tableName,
  toRole,
} from "../shared/db";
import { response } from "../shared/http";
import { logRequest } from "../shared/request-logger";


export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  logRequest(event);

  const movieId = parseId(event.pathParameters?.movieID);
  if (movieId === undefined) {
    return response(400, { message: "movieID must be a positive integer" });
  }

  const actorParam = event.queryStringParameters?.actor;
const actorId = parseId(actorParam);

if (actorParam !== undefined && actorId === undefined) {
  return response(400, { message: "actor must be a positive integer" });
}

  try {

    const movie = await ddb.send(         // a movie record uses the movie key for both PK and SK                                       
      new GetCommand({
        TableName: tableName,
        Key: { PK: movieKey(movieId), SK: movieKey(movieId)},
      })
    );
    
if (!movie.Item) {
  return response(404, { message: `Movie ${movieId} not found`}) // return 404 for a missing movie, whether or not an actor was supplied.          
}



 // a role record uses the movie key as PK and the actor key as SK
    if (actorId !== undefined) {
  const result = await ddb.send(
    new GetCommand({
      TableName: tableName,
      Key: { PK: movieKey(movieId), SK: actorKey(actorId) },
    })
  );
// keps the information in an array, even when the actor has no role in the movie
  return response(200, {
    data: result.Item ? [toRole(result.Item)] : [],
  });
}
    const queryResult = await ddb.send(
      new QueryCommand({
        TableName: tableName,
        KeyConditionExpression: "PK = :pk",
        ExpressionAttributeValues: { ":pk": movieKey(movieId) },
        // ExclusiveStartKey: lastKey,
      })
    );

    const resultItems = queryResult.Items ?? [];
    return response(200, { data: resultItems.filter(isRoleItem).map(toRole) });
  } catch (err) {
    console.error("DynamoDB error:", err);
    return response(500, {
      message: "Internal server error",
      error: err,
    });
  }
};
