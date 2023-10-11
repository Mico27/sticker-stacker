import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";
import {validateAuth, getResponse} from "../opt/nodejs/utils.mjs";

const client = new DynamoDBClient({ region: 'us-east-2' });

const getUsers = async (channelId, sortKey, limit, exclusiveStartKey) => {
  const result = await client.send(new QueryCommand({
    TableName: 'Twitch-Ext-StickerStacker-Users',
    IndexName: (sortKey)? (sortKey + '-index'): undefined,
    ExclusiveStartKey: exclusiveStartKey,
    Limit: limit,
    KeyConditionExpression: 'channelId = :v1',
    ExpressionAttributeValues: {
      ':v1': {
        'S': channelId
      },
    },
  }));
  return {items: result.Items, lastEvaluatedKey: result.LastEvaluatedKey};
};

export const handler = async (event, context) => {
  const auth = validateAuth(event.headers.Authorization);
  if (auth.err) return getResponse(event, {statusCode: 401, body: JSON.stringify(auth)});
  const body = JSON.parse(event.body) || { limit: 100 };
  // Get users from database.
  const users = await getUsers(auth.channel_id, body.sortKey, body.limit, body.exclusiveStartKey);
  if (!users) return getResponse(event, {statusCode: 500, body: 'Internal Server Error'});
  return getResponse(event, {statusCode: 200, body: JSON.stringify(users)});
};