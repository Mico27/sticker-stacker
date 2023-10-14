import { DynamoDBClient, GetItemCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import {validateAuth, getResponse} from "../opt/nodejs/utils.mjs";
import {map} from "underscore";

const client = new DynamoDBClient({ region: 'us-east-2' });

const getConfig = async (channelId) => {
  const result = await client.send(new GetItemCommand({
    TableName: 'Twitch-Ext-StickerStacker-Channels',
    Key: {
      "channelId": {
        "S": channelId
      }
    },
  }));
  const config = {};
  if (!result.Item || !result.Item.token || !result.Item.token.S){
    config.requireAuth = true;
  } else {
    const token = JSON.parse(result.Item.token.S);
    let savedConfig = null;
    if (result.Item && result.Item.config && result.Item.config.S){
      savedConfig = JSON.parse(result.Item.config.S);
    }
    config.splitPacks = (savedConfig)? (savedConfig.splitPacks || false): false;
    config.rewards = (savedConfig)? (savedConfig.rewards || []): [];
    config.rewardDetails = getRewards(token, channelId, map(config.rewards, (reward)=> reward.id));
  }
  return config;
};

const getRewards = async (token, channelId, rewardIds) => {
  if (rewardIds && rewardIds.length) {
    const rewardIdQuery = map(rewardIds, (rewardId) => ('id=' + rewardId)).join('&');
    const response = await fetch('https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=' + channelId + '&' + rewardIdQuery, {
      method: 'GET',
      headers: {
        'client-id': process.env.client_id,
        'Authorization': 'Bearer ' + token.access_token
      }
    });
    if (!response.ok) {
      if (response.status === 404) {
        return [];
      }
      if (response.status === 401){
        const newToken = await refreshToken(channelId, token);
        return await getRewards(newToken, channelId, rewardIds);
      }
      throw new Error(await response.text());
    }
    return await response.json();
  }
  return [];
}

const refreshToken = async (channelId, token) => {
  const params = new URLSearchParams();
  params.append('client_id', process.env.client_id);
  params.append('client_secret', process.env.client_secret);
  params.append('grant_type', 'refresh_token');
  params.append('refresh_token', token.refresh_token);
  const response = await fetch('https://id.twitch.tv/oauth2/token', {method: 'POST', body: params});
  if (!response.ok){
    await registerUserToken(channelId, null);
    throw new Error(await response.text());//todo make a custom error type for invalid access
  }
  const newToken = await response.json();
  await registerUserToken(channelId, newToken);
  return newToken;
}

const registerUserToken = async (channelId, token)=>{
  await client.send(new UpdateItemCommand({
    "TableName": "Twitch-Ext-StickerStacker-Channels",
    "Key": {
      "channelId": {
        "S": channelId
      }
    },
    "ExpressionAttributeNames": {
      "#A": "token"
    },
    "ExpressionAttributeValues": {
      ":A": {
        "S": (token)? JSON.stringify(token): ''
      }
    },
    "UpdateExpression": "SET #A = :A"
  }));
}

export const handler = async (event, context) => {
  const auth = validateAuth(event.headers.Authorization);
  if (auth.err) return getResponse(event, {statusCode: 401, body: JSON.stringify(auth)});
  const body = JSON.parse(event.body);
  // Get users from database.
  const config = await getConfig(auth.channel_id);
  if (!config) return getResponse(event, {statusCode: 500, body: 'Internal Server Error'});
  return getResponse(event, {statusCode: 200, body: JSON.stringify(config)});
};