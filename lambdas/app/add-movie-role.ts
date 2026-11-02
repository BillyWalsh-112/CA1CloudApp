import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import type { TransactionCanceledException } from "@aws-sdk/client-dynamodb";
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


// check the movie and actor exist before adding the role
  await ddb.send(
    new TransactWriteCommand({
      TransactItems: [
        {
          // check that the movie exists in DynamoDB
          ConditionCheck: {
            TableName: tableName,
            Key: {
              PK: movieKey(role.movieId),
              SK: movieKey(role.movieId),
            },
            ConditionExpression: "attribute_exists(PK)",
          },
        },
        {
          // check that the actor exists in DynamoDB
          ConditionCheck: {
            TableName: tableName,
            Key: {
              PK: actorKey(role.actorId),
              SK: actorKey(role.actorId),
            },
            ConditionExpression: "attribute_exists(PK)",
          },
        },
        {
          // add the role without overwriting an existing role
          Put: {
            TableName: tableName,
             Item: {
                PK: movieKey(role.movieId),
                SK: actorKey(role.actorId),
                movieId: role.movieId,
               actorId: role.actorId,
               roleName: role.roleName,
               roleDescription: role.roleDescription,
            },
            ConditionExpression:
              "attribute_not_exists(PK) AND attribute_not_exists(SK)",
          },
        },
      ],
    })
  );

  // return 201 when the role has been saved successfully
  return response(201, { message: "Role added", data: role,
  });


} catch (err) {
  // check the error name to see if the DynamoDB transaction failed
  const name = (err as Error).name;

  if (name === "TransactionCanceledException") {
    // get the reason for each operation in the transaction
const reasons = (err as TransactionCanceledException).CancellationReasons;

    // Position 0 checks whether the movie exists
    if (reasons?.[0]?.Code === "ConditionalCheckFailed") {
      return response(400, {
        message: `Movie ${role.movieId} not found`,
      });
    }

    // Position 1 checks whether the actor exists
    if (reasons?.[1]?.Code === "ConditionalCheckFailed") {
      return response(400, {
        message: `Actor ${role.actorId} not found`,
      });
    }

    // Position 2 checks whether the role already exists
    if (reasons?.[2]?.Code === "ConditionalCheckFailed") {
      return response(409, {
        message: "Role already exists",
      });
    }
  }

  // Log unexpected errors to CloudWatch without sending details back
  console.error("Unexpected DynamoDB error:", err);

  return response(500, {
    message: "Internal server error",
  });
}



};

