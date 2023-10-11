import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import {validateAuth, getResponse} from "../opt/nodejs/utils.mjs";

const client = new DynamoDBClient({ region: 'us-east-2' });

const getUser = async (channelId, userId) => {
  const result = await client.send(new GetItemCommand({
    TableName: 'Twitch-Ext-StickerStacker-Users',
    Key: {
      "channelId": {
        "S": channelId
      },
      "userId": {
        "S": userId
      }
    },
  }));
  return {item: result.Item};
};

export const handler = async (event, context) => {
  const auth = validateAuth(event.headers.Authorization);
  if (auth.err) return getResponse(event, {statusCode: 401, body: JSON.stringify(auth)});
  const body = JSON.parse(event.body);
  // Get users from database.
  const user = await getUser(auth.channel_id, body.clientId);
  if (!user) return getResponse(event, {statusCode: 500, body: 'Internal Server Error'});
  return getResponse(event, {statusCode: 200, body: JSON.stringify(user)});
};