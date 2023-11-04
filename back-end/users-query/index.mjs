import { DynamoDBClient, GetItemCommand, QueryCommand } from "@aws-sdk/client-dynamodb";
import {validateAuth, getResponse, refreshToken, ApiError, RequireTwitchAuthError} from "../opt/nodejs/utils.mjs";
import {map, indexBy} from "underscore";
import fetch from 'node-fetch';

const client = new DynamoDBClient({ region: 'us-east-2' });

const getChannelData = async (channelId) => {
  const result = await client.send(new GetItemCommand({
    TableName: 'Twitch-Ext-StickerStacker-Channels',
    Key: {
      "channelId": {
        "S": channelId
      }
    },
  }));
  const channelData = { channelId: channelId };
  if (!result.Item || !result.Item.token || !result.Item.token.S){
    throw new RequireTwitchAuthError();
  } else {
    channelData.token = JSON.parse(result.Item.token.S);
  }
  return channelData;
};

const getUsers = async (channelData, sortKey, nameSearch, exclusiveStartKey) => {
  let keyConditionExpression = 'channelId = :v1';
  let expressionAttributeValues = {
    ':v1': {
      'S': channelData.channelId
    },
  };
  if (nameSearch) {
    keyConditionExpression += ' and begins_with(userName, :v2)';
    expressionAttributeValues[':v2'] = {
      'S': nameSearch
    };
  }
  const result = await client.send(new QueryCommand({
    TableName: 'Twitch-Ext-StickerStacker-Users',
    IndexName: (sortKey) ? (sortKey + '-index') : undefined,
    ExclusiveStartKey: exclusiveStartKey,
    Limit: 100,
    KeyConditionExpression: keyConditionExpression,
    ExpressionAttributeValues: expressionAttributeValues,
  }));
  const items = (result.Items || []);
  const userIds = map(items, (item) => item.userId.S);
  if (userIds && userIds.length) {
    const userDetails = await getUserDetails(channelData, userIds);
    return {
      items: map(items, (item) => {
        const details = (userDetails) ? userDetails[item.userId.S] : undefined;
        return {
          channelId: channelData.channelId,
          userId: item.userId.S,
          score: item.score.N,
          display_name: (details) ? details.display_name : '',
          profile_image_url: (details) ? details.profile_image_url : '',
        };
      }), lastEvaluatedKey: result.LastEvaluatedKey
    };
  }
  return {items: [], lastEvaluatedKey: result.LastEvaluatedKey};
};

const getUserDetails = async (channelData, userIds, abortOn401)=>{
  const userIdQuery = map(userIds, (userId) => ('id=' + userId)).join('&');
  const response = await fetch('https://api.twitch.tv/helix/users?' + userIdQuery, {
    method: 'GET',
    headers: {
      'Client-Id': process.env.client_id,
      'Authorization': 'Bearer ' + channelData.token.access_token
    }
  });
  if (!response.ok) {
    if (response.status === 404) {
      return {};
    }
    if (response.status === 401 && !abortOn401){
      channelData.token = await refreshToken(client, channelData.channelId, channelData.token);
      return await getUserDetails(channelData, userIds, true);
    }
    throw new ApiError(await response.text(), response.status);
  }
  const json = await response.json();
  return (json && json.data)? indexBy(json.data, 'id'): {};
}

export const handler = async (event, context) => {
  try {
    const auth = validateAuth(event.headers.Authorization);
    const body = JSON.parse(event.body) || {};
    // Get users from database.
    const channelData = await getChannelData(auth.channel_id);
    const users = await getUsers(channelData, body.sortKey, body.nameSearch, body.exclusiveStartKey);
    return getResponse(event, {statusCode: 200, body: JSON.stringify(users)});
  } catch (err) {
    console.error(err);
    if (err instanceof ApiError) {
      return getResponse(event, {statusCode: err.statusCode, body: err.message});
    } else {
      return getResponse(event, {statusCode: 500, body: err.message});
    }
  }
};