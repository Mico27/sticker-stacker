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
    let savedConfig = null;
    if (result.Item && result.Item.config && result.Item.config.S){
      savedConfig = JSON.parse(result.Item.config.S);
    }
    config.splitPacks = (savedConfig)? (savedConfig.splitPacks || false): false;
  }
  return config;
};

const createReward = async (access_token, channelId, reward) => {
  const response = await fetch('https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=' + channelId, {
    method: 'POST',
    body: JSON.stringify(reward),
    headers: {
      'client-id': process.env.client_id,
      'Authorization': 'Bearer ' + access_token,
      'Content-Type': 'application/json'
    }
  });
  if (!response.ok){
    throw new Error(await response.text());
  }
  return await response.json();
}

const updateRewards = async (access_token, channelId, rewards) => {

  return Promise.all(map(rewards, (reward)=>{
    return createReward(access_token, channelId, reward);
  }));
}

const getRewards = async (access_token, channelId, rewardIds) => {
  const rewardIdQuery = map(rewardIds, (rewardId) => ('id=' + rewardId)).join('&');
  const response = await fetch('https://api.twitch.tv/helix/channel_points/custom_rewards?broadcaster_id=' + channelId + '&' + rewardIdQuery, {
    method: 'GET',
    headers: {
      'client-id': process.env.client_id,
      'Authorization': 'Bearer ' + access_token
    }
  });
  if (!response.ok) {
    if (response.status === 404){
      return [];
    }
    throw new Error(await response.text());
  }
  return await response.json();
}

const updateConfig = async (channelId, oldConfig, newConfig) => {

  const expressionAttributeNames = {};
  const expressionAttributeValues = {};
  const updateExpressions = [];
  const oldToken = ((oldConfig.token)? JSON.stringify(oldConfig.token): '');
  const newToken = ((newConfig.token)? JSON.stringify(newConfig.token): '');
  if (oldToken !== newToken){
    expressionAttributeNames["#A"] = "token";
    expressionAttributeValues[":A"] = { "S": newToken };
    updateExpressions.push("#A = :A");
  }
  const oldConfigData = ((oldConfig.config)? JSON.stringify(oldConfig.config): '');
  const newConfigData = ((newConfig.config)? JSON.stringify(newConfig.config): '');
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
          "S": channelId
        }
      },
      "ExpressionAttributeNames": expressionAttributeNames,
      "ExpressionAttributeValues": expressionAttributeValues,
      "UpdateExpression": ("SET " + updateExpressions.join(", "))
    }));
  }
};

export const handler = async (event, context) => {
  const auth = validateAuth(event.headers.Authorization);
  if (auth.err) return getResponse(event, {statusCode: 401, body: JSON.stringify(auth)});
  const body = JSON.parse(event.body);
  // Get users from database.
  let config = await getConfig(auth.channel_id);
  config = await updateConfig(auth.channel_id, config, body.config);
  if (!config) return getResponse(event, {statusCode: 500, body: 'Internal Server Error'});
  return getResponse(event, {statusCode: 200, body: JSON.stringify(config)});
};