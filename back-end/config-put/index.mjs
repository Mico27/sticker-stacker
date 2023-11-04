import { DynamoDBClient, GetItemCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import {validateAuth, getResponse, refreshToken, RequireTwitchAuthError, ApiError} from "../opt/nodejs/utils.mjs";
import {map, indexBy} from "underscore";
import fetch from 'node-fetch';
const client = new DynamoDBClient({ region: 'us-east-2' });
let appAccessToken = null;

const getAppAccessToken = async ()=>{
  if (!appAccessToken) {
    const params = new URLSearchParams();
    params.append('client_id', process.env.client_id);
    params.append('client_secret', process.env.client_secret);
    params.append('grant_type', 'client_credentials');
    const response = await fetch('https://id.twitch.tv/oauth2/token', {method: 'POST', body: params});
    if (!response.ok) {
      throw new Error(await response.text());
    }
    appAccessToken = await response.json();
  }
  return appAccessToken;
}


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

const updateChannelData = async (channelData, newChannelData) => {
  const expressionAttributeNames = {};
  const expressionAttributeValues = {};
  const updateExpressions = [];
  const oldToken = ((channelData.token)? JSON.stringify(channelData.token): '');
  const newToken = ((newChannelData.token)? JSON.stringify(newChannelData.token): '');
  if (oldToken !== newToken){
    expressionAttributeNames["#A"] = "token";
    expressionAttributeValues[":A"] = { "S": newToken };
    updateExpressions.push("#A = :A");
  }
  const oldConfigData = ((channelData.config)? JSON.stringify(channelData.config): '');
  const newConfigData = ((newChannelData.config)? JSON.stringify(newChannelData.config): '');
  if (oldConfigData !== newConfigData){
    expressionAttributeNames["#B"] = "config";
    expressionAttributeValues[":B"] = { "S": newConfigData };
    updateExpressions.push("#B = :B");
  }
  if (updateExpressions.length > 0) {
    await client.send(new UpdateItemCommand({
      "TableName": "Twitch-Ext-StickerStacker-Channels",
      "Key": {
        "channelId": {
          "S": channelData.channelId
        }
      },
      "ExpressionAttributeNames": expressionAttributeNames,
      "ExpressionAttributeValues": expressionAttributeValues,
      "UpdateExpression": ("SET " + updateExpressions.join(", "))
    }));
  }
};

const updateConfig = async (channelData, splitPacks) => {
  channelData.config.splitPacks = splitPacks;
  const packs = (channelData.config.splitPacks)? ['fish', 'bronze', 'snack']: ['any'];
  await Promise.all(map(packs, (pack)=>{
    return updateReward(channelData, pack);
  }));
}

const updateReward = async (channelData, pack) => {
  let reward = channelData.config.rewards[pack];
  if (!reward){
    reward = {};
  }
  if (!reward.id){
    const createdReward = await createReward(channelData, pack);
    reward.id = createdReward.id;
    channelData.rewardDetails[createdReward.id] = createdReward;
  }
  if (!reward.removeWebHookId){
    const removeWebHook = await createRemoveCustomRewardWebHooks(channelData, reward.id);
    reward.removeWebHookId = removeWebHook.data[0].id;
  }
  if (!reward.redemptionWebHookId){
    const redemptionWebHook = await createRewardRedemptionWebHooks(channelData, reward.id);
    reward.redemptionWebHookId = redemptionWebHook.data[0].id;
  }
  channelData.config.rewards[pack] = reward;
}

const getRewards = async (channelData, abortOn401) => {
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
      if (response.status === 401 && !abortOn401){
        channelData.token = await refreshToken(client, channelData.channelId, channelData.token);
        return await getRewards(channelData, true);
      }
      throw new ApiError(await response.text(), response.status);
    }
    return await response.json();
  }
  return [];
}

const createReward = async (channelData, pack, abortOn401) => {
  const response = await fetch('https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=' + channelData.channelId, {
    method: 'POST',
    body: JSON.stringify(getNewRewardData(pack)),
    headers: {
      'Client-Id': process.env.client_id,
      'Authorization': 'Bearer ' + channelData.token.access_token,
      'Content-Type': 'application/json'
    }
  });
  if (!response.ok){
    if (response.status === 401 && !abortOn401){
      channelData.token = await refreshToken(client, channelData.channelId, channelData.token);
      return await createReward(channelData, pack, true);
    }
    throw new ApiError(await response.text(), response.status);
  }
  const newReward = await response.json();
  newReward.pack = pack;
  return newReward;
}

const getNewRewardData = (pack) => {
  return {
    title: getRewardTitle(pack),
    cost: 500,
    background_color: getRewardBackgroundColor(pack),
    is_global_cooldown_enabled: true,
    global_cooldown_seconds: 5,
  }
}

const getRewardTitle = (pack)=>{
  switch (pack){
    case 'fish':
      return 'Get a fish sticker';
    case 'bronze':
      return 'Get a bronze sticker';
    case 'snack':
      return 'Get a snack sticker';
    default:
      return 'Get a sticker';
  }
}

const getRewardBackgroundColor = (pack)=>{
  switch (pack){
    case 'fish':
      return '#5fd7d0';
    case 'bronze':
      return '#d7975f';
    case 'snack':
      return '#ad5fd7';
    default:
      return '#5fd765';
  }
}

const createRemoveCustomRewardWebHooks = async (channelData, rewardId, abortOn401)=>{
  const appToken = await getAppAccessToken();
  const response = await fetch('https://api.twitch.tv/helix/eventsub/subscriptions', {
    method: 'POST',
    body: JSON.stringify({
      type: 'channel.channel_points_custom_reward.remove',
      version: '1',
      condition: {
        broadcaster_user_id: channelData.channelId,
        reward_id: rewardId,
      },
      transport: {
        method: 'webhook',
        callback: 'https://localhost/webhooks/remove-reward',
        secret: process.env.webhook_secret,
      }
    }),
    headers: {
      'Client-Id': process.env.client_id,
      'Authorization': 'Bearer ' + appToken.access_token,
      'Content-Type': 'application/json'
    }
  });
  if (!response.ok){
    if (response.status === 401 && !abortOn401){
      appAccessToken = null;
      return await createRemoveCustomRewardWebHooks(channelData, rewardId, true);
    }
    throw new ApiError(await response.text(), response.status);
  }
  return await response.json();
}

const createRewardRedemptionWebHooks = async (channelData, rewardId, abortOn401)=>{
  const appToken = await getAppAccessToken();
  const response = await fetch('https://api.twitch.tv/helix/eventsub/subscriptions', {
    method: 'POST',
    body: JSON.stringify({
      type: 'channel.channel_points_custom_reward_redemption.add',
      version: '1',
      condition: {
        broadcaster_user_id: channelData.channelId,
        reward_id: rewardId,
      },
      transport: {
        method: 'webhook',
        callback: 'https://localhost/webhooks/reward-redemption',
        secret: process.env.webhook_secret,
      }
    }),
    headers: {
      'Client-Id': process.env.client_id,
      'Authorization': 'Bearer ' + appToken.access_token,
      'Content-Type': 'application/json'
    }
  });
  if (!response.ok){
    if (response.status === 401 && !abortOn401){
      appAccessToken = null;
      return await createRewardRedemptionWebHooks(channelData, rewardId, true);
    }
    throw new ApiError(await response.text(), response.status);
  }
  return await response.json();
}

export const handler = async (event, context) => {
  try
  {
    const auth = validateAuth(event.headers.Authorization);
    const body = JSON.parse(event.body);
    const channelData = await getChannelData(auth.channel_id);
    const oldChannelData = JSON.parse(JSON.stringify(channelData));
    await updateConfig(channelData, body.splitPacks);
    await updateChannelData(oldChannelData, channelData);
    return getResponse(event, {statusCode: 200, body: JSON.stringify({
        splitPacks: channelData.config.splitPacks,
        rewards: channelData.rewardDetails
      })});
  }
  catch(err) {
    console.error(err);
    if (err instanceof ApiError) {
      return getResponse(event, {statusCode: err.statusCode, body: err.message});
    } else if (err instanceof  RequireTwitchAuthError) {
      return getResponse(event, {statusCode: 200, body: JSON.stringify({requireAuth: true})});
    } else {
      return getResponse(event, {statusCode: 500, body: err.message});
    }
  }
};