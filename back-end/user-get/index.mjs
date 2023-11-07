import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import {validateAuth, getResponse, ApiError, refreshToken, RequireTwitchAuthError} from "../opt/nodejs/utils.mjs";
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

const getUser = async (channelData, userId) => {
  const user = {
    channelId: channelData.channelId,
    userId: userId,
  }
  const result = await client.send(new GetItemCommand({
    TableName: 'Twitch-Ext-StickerStacker-Users',
    Key: {
      "channelId": {
        "S": channelData.channelId
      },
      "userId": {
        "S": userId
      }
    },
  }));
  const item = result.Item;
  user.score = (item)? item.score.N: 0;
  const details = await getUserDetails(channelData, userId);
  user.display_name = (details)? details.display_name: '';
  user.profile_image_url = (details)? details.profile_image_url: '';
  return user;
};


const getUserDetails = async (channelData, userId, abortOn401)=>{
  const response = await fetch('https://api.twitch.tv/helix/users?id=' + userId, {
    method: 'GET',
    headers: {
      'Client-Id': process.env.client_id,
      'Authorization': 'Bearer ' + channelData.token.access_token
    }
  });
  if (!response.ok) {
    if (response.status === 404) {
      return undefined;
    }
    if (response.status === 401 && !abortOn401){
      channelData.token = await refreshToken(client, channelData.channelId, channelData.token);
      return await getUserDetails(channelData, userId, true);
    }
    throw new ApiError(await response.text(), response.status);
  }
  const json = await response.json();
  return (json && json.data)? json.data[0]: undefined;
}

export const handler = async (event, context) => {
  try {
    const auth = validateAuth(event.headers.authorization);
    const user_id = (event.queryStringParameters && event.queryStringParameters.user_id)?
      event.queryStringParameters.user_id: auth.user_id;
    console.log(event);
    console.log(auth);
    // Get users from database.
    const channelData = await getChannelData(auth.channel_id);
    const user = await getUser(channelData, user_id);
    return getResponse(event, {statusCode: 200, body: JSON.stringify(user)});
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