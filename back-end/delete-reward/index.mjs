import { DynamoDBClient, GetItemCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import {getResponse, RequireTwitchAuthError} from "../opt/nodejs/utils.mjs";
import {omit} from "underscore";
import { Buffer } from 'node:buffer';
const { createHmac, timingSafeEqual } = await import('node:crypto');

const client = new DynamoDBClient({ region: 'us-east-2' });

// Notification request headers
const TWITCH_MESSAGE_ID = 'Twitch-Eventsub-Message-Id';
const TWITCH_MESSAGE_TIMESTAMP = 'Twitch-Eventsub-Message-Timestamp';
const TWITCH_MESSAGE_SIGNATURE = 'Twitch-Eventsub-Message-Signature';
const MESSAGE_TYPE = 'Twitch-Eventsub-Message-Type';

// Notification message types
const MESSAGE_TYPE_VERIFICATION = 'webhook_callback_verification';
const MESSAGE_TYPE_NOTIFICATION = 'notification';
const MESSAGE_TYPE_REVOCATION = 'revocation';

// Prepend this string to the HMAC that's created from the message
const HMAC_PREFIX = 'sha256=';

const getSecret = () => {
  // TODO: Get secret from secure storage. This is the secret you pass
  // when you subscribed to the event.
  return process.env.webhook_secret;
}

// Build the message used to get the HMAC.
const getHmacMessage = (request) => {
  return (request.headers[TWITCH_MESSAGE_ID] +
    request.headers[TWITCH_MESSAGE_TIMESTAMP] +
    request.body);
}

// Get the HMAC.
const getHmac = (secret, message) => {
  return createHmac('sha256', secret)
    .update(message)
    .digest('hex');
}

// Verify whether our hash matches the hash that Twitch passed in the header.
const verifyMessage = (hmac, verifySignature) => {
  return timingSafeEqual(Buffer.from(hmac), Buffer.from(verifySignature));
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
  if (result.Item){
    let savedConfig = null;
    if (result.Item && result.Item.config && result.Item.config.S){
      savedConfig = JSON.parse(result.Item.config.S);
    }
    channelData.config = {};
    channelData.config.splitPacks = (savedConfig)? (savedConfig.splitPacks || false): false;
    channelData.config.rewards = (savedConfig)? (savedConfig.rewards || {}): {};
  }
  return channelData;
};

const updateChannelData = async (channelData, newChannelData) => {
  const expressionAttributeNames = {};
  const expressionAttributeValues = {};
  const updateExpressions = [];
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

const deleteReward = async (channelId, rewardId) => {
  const channelData = await getChannelData(channelId);
  const oldChannelData = JSON.parse(JSON.stringify(channelData));
  if (channelData.config && channelData.config.rewards) {
    channelData.config.rewards = omit(channelData.config.rewards, (x) => x.id === rewardId);
  }
  await updateChannelData(oldChannelData, channelData);
}

const deleteWebhook = async (channelId, webhookId) => {
  const channelData = await getChannelData(channelId);
  const oldChannelData = JSON.parse(JSON.stringify(channelData));
  if (channelData.config && channelData.config.rewards) {
    channelData.config.rewards = omit(channelData.config.rewards, (x) => x.removeWebHookId === webhookId);
  }
  await updateChannelData(oldChannelData, channelData);
}

export const handler = async (event) => {
  try {
    //let secret = getSecret();
    //let message = getHmacMessage(event);
    //let hmac = HMAC_PREFIX + getHmac(secret, message);  // Signature to compare

    if (event.headers[TWITCH_MESSAGE_SIGNATURE]) {
      let notification = JSON.parse(event.body);
      if (MESSAGE_TYPE_NOTIFICATION === event.headers[MESSAGE_TYPE]) {
        if (notification.subscription.type === "channel.channel_points_custom_reward.remove") {
          await deleteReward(notification.event.broadcaster_user_id, notification.event.id);
        }
        return getResponse(event, {statusCode: 204});
      } else if (MESSAGE_TYPE_VERIFICATION === event.headers[MESSAGE_TYPE]) {
        return getResponse(event, {
          statusCode: 200,
          body: notification.challenge,
          headers: {'Content-Type': 'text/plain'}
        });
      } else if (MESSAGE_TYPE_REVOCATION === event.headers[MESSAGE_TYPE]) {
        if (notification.subscription.type === "channel.channel_points_custom_reward.remove") {
          await deleteWebhook(notification.subscription.condition.broadcaster_user_id, notification.subscription.id);
        }
        return getResponse(event, {statusCode: 204});
      } else {
        return getResponse(event, {statusCode: 204});
      }
    } else {
      return getResponse(event, {statusCode: 204});
    }
  }
  catch (err){
    console.error(err);
    return getResponse(event, {statusCode: 204});
  }
};