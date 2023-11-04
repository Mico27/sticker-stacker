import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
import {validateAuth, getResponse, refreshToken, RequireTwitchAuthError, ApiError} from "../opt/nodejs/utils.mjs";
import {map, indexBy} from "underscore";

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
    let savedConfig = null;
    if (result.Item && result.Item.config && result.Item.config.S){
      savedConfig = JSON.parse(result.Item.config.S);
    }
    channelData.config = {};
    channelData.config.splitPacks = (savedConfig)? (savedConfig.splitPacks || false): false;
    channelData.config.rewards = (savedConfig)? (savedConfig.rewards || {}): {};
    channelData.rewardDetails = indexBy(await getRewards(channelData), 'id') || {};
  }
  return channelData;
};

const getRewards = async (channelData) => {
  const rewardIds = map(channelData.config.rewards, (reward)=> reward.id);
  if (rewardIds && rewardIds.length) {
    const rewardIdQuery = map(rewardIds, (rewardId) => ('id=' + rewardId)).join('&');
    const response = await fetch('https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=' + channelData.channelId + '&' + rewardIdQuery, {
      method: 'GET',
      headers: {
        'Client-Id': process.env.client_id,
        'Authorization': 'Bearer ' + channelData.token.access_token
      }
    });
    if (!response.ok) {
      if (response.status === 404) {
        return [];
      }
      if (response.status === 401){
        channelData.token = await refreshToken(client, channelData.channelId, channelData.token);
        return await getRewards(channelData);
      }
      throw new ApiError(await response.text(), response.status);
    }
    return await response.json();
  }
  return [];
}

export const handler = async (event, context) => {
  try {
    const auth = validateAuth(event.headers.Authorization);
    const channelData = await getChannelData(auth.channel_id);
    return getResponse(event, {statusCode: 200, body: JSON.stringify({
        splitPacks: channelData.config.splitPacks,
        rewards: channelData.rewardDetails
      })});
  }
  catch (err){
    console.error(err);
    if (err instanceof ApiError){
      return getResponse(event, {statusCode: err.statusCode, body: err.message});
    } else if (err instanceof  RequireTwitchAuthError) {
      return getResponse(event, {statusCode: 200, body: JSON.stringify({requireAuth: true})});
    } else {
      return getResponse(event, {statusCode: 500, body: err.message});
    }
  }
};