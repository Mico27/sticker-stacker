import { DynamoDBClient, QueryCommand } from "@aws-sdk/client-dynamodb";
import {validateAuth, getResponse, ApiError} from "../opt/nodejs/utils.mjs";
import {forEach} from "underscore";

const client = new DynamoDBClient({ region: 'us-east-2' });

const getInventory = async (channelId, userId) => {
  let result = undefined;
  let accumulated = {};
  let exclusiveStartKey = undefined;
  do {
    result = await client.send(new QueryCommand({
      "TableName": "Twitch-Ext-StickerStacker-Inventory",
      "ExclusiveStartKey": exclusiveStartKey,
      "ExpressionAttributeValues": {
        ":A": {
          "S": (channelId + '-' + userId)
        }
      },
      "KeyConditionExpression": "channelId-userId = :A",
      "ProjectionExpression": "itemId, amount",
    }));
    exclusiveStartKey = result.LastEvaluatedKey;
    forEach(result.Items || [], (item)=>{
      accumulated[item.itemId.S] = Number(item.amount.N)
    })
  } while (result.Items.length || result.LastEvaluatedKey);
  return accumulated;
};

export const handler = async (event, context) => {
  try {
    const auth = validateAuth(event.headers.Authorization);
    const user_id = event.queryStringParameters.user_id || auth.user_id;
    const inventory = await getInventory(auth.channel_id, user_id);
    return getResponse(event, {statusCode: 200, body: JSON.stringify(inventory)});
  }
  catch (err){
    console.error(err);
    if (err instanceof ApiError) {
      return getResponse(event, {statusCode: err.statusCode, body: err.message});
    } else {
      return getResponse(event, {statusCode: 500, body: err.message});
    }
  }
};