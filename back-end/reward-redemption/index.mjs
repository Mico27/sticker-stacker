import { DynamoDBClient, GetItemCommand, UpdateItemCommand, QueryCommand } from "@aws-sdk/client-dynamodb";
import {ApiError, getResponse, refreshToken} from "../opt/nodejs/utils.mjs";
import {find, filter, findKey, reduce, map, min, pick, contains, forEach, omit, uniq} from "underscore";
import { Buffer } from 'node:buffer';
import data from "../opt/nodejs/staticData.mjs";
const { createHmac, timingSafeEqual } = await import('node:crypto');
import jsonwebtoken from 'jsonwebtoken';
import fetch from 'node-fetch';

const client = new DynamoDBClient({ region: 'us-east-2' });
const channelBroadcastCooldowns = {};

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

let appAccessToken = null;

const getAppAccessToken = async ()=>{
  if (!appAccessToken) {
    const params = {
      'client_id': process.env.client_id,
      'client_secret': process.env.client_secret,
      'grant_type': 'client_credentials',
    };
    const response = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      headers:{
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
      },
      body: Object.keys(params)
        .map((key) => { return encodeURIComponent(key) + '=' + encodeURIComponent(params[key]); })
        .join('&'),
    });
    if (!response.ok) {
      throw new Error(await response.text());
    }
    appAccessToken = await response.json();
  }
  return appAccessToken;
}

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

const updateInventory = async (channelId, userId, itemId, amount) => {
  await client.send(new UpdateItemCommand({
    "TableName": "Twitch-Ext-StickerStacker-Inventory",
    "Key": {
      "channelId-userId": {
        "S": (channelId + '-' + userId)
      },
      "itemId": {
        "S": itemId
      }
    },
    "ExpressionAttributeNames": {
      "#A": "amount"
    },
    "ExpressionAttributeValues": {
      ":A": {
        "N": String(amount)
      }
    },
    "UpdateExpression": "ADD #A :A"
  }));
};

const addSingleRandomInventoryItem = async (channelId, userId, redemptionWebHookId) => {
  const channelData = await getChannelData(channelId);
  let pack = null;
  if (channelData.config && channelData.config.rewards){
    pack = findKey(channelData.config.rewards, (x) => x.redemptionWebHookId === redemptionWebHookId);
    if (!pack){
      await revokeWebhook(channelData, redemptionWebHookId);
      return;
    } else if (pack === 'any'){
      pack = null;
    }
  } else {
    await revokeWebhook(channelData, redemptionWebHookId);
    return;
  }
  const roll = Math.random();
  let acc = 0;
  const rarity = find(data.rarities, (x)=>{
    if (roll > (1.0 - x.chance) - acc) {
      return true;
    }
    acc += x.chance;
    return false;
  });
  if (!rarity){
    console.log('Rarity not found for roll: ' + roll);
    return;
  }
  const itemTypes = filter(data.itemTypes, (x)=> x.rarity === rarity.id && (pack ? x.pack === pack: true));
  if (!itemTypes.length){
    console.log('item types not found for rarity: ' + rarity.id);
    if (pack){
      console.log('... in pack: ' + pack);
    }
    return;
  }
  const itemType = itemTypes[(Math.floor(Math.random() * itemTypes.length))];
  await updateInventory(channelId, userId, itemType.id, 1);
  await updateUserScore(channelId, userId);
  attemptSendUserChangeBroadcast(channelId, userId);
}

const updateUserScore = async (channelId, userId) => {
  const userInventory = await getInventory(channelId, userId) || [];
  const score = reduce(userInventory, (total, amount, itemId) => {
    const itemType = data.itemTypes[itemId] || {};
    const rarity = data.rarities[itemType.rarity] || {};
    return total + (amount * (rarity.score || 0));
  }, 0) + reduce(getUserScoreThemes(userInventory), (total, x) => total + x.score, 0);
  await client.send(new UpdateItemCommand({
    "TableName": "Twitch-Ext-StickerStacker-Users",
    "Key": {
      "channelId": {
        "S": channelId
      },
      "userId": {
        "S": userId
      }
    },
    "ExpressionAttributeNames": {
      "#A": "score"
    },
    "ExpressionAttributeValues": {
      ":A": {
        "N": String(score)
      }
    },
    "UpdateExpression": "SET #A = :A"
  }));
}

const getInventory = async (channelId, userId) => {
  let result = undefined;
  let accumulated = {};
  let exclusiveStartKey = undefined;
  do {
    result = await client.send(new QueryCommand({
      "TableName": "Twitch-Ext-StickerStacker-Inventory",
      "ExclusiveStartKey": exclusiveStartKey,
      "ExpressionAttributeNames": {
        "#A": "channelId-userId"
      },
      "ExpressionAttributeValues": {
        ":A": {
          "S": (channelId + '-' + userId)
        }
      },
      "KeyConditionExpression": "#A = :A",
      "ProjectionExpression": "itemId, amount",
    }));
    exclusiveStartKey = result.LastEvaluatedKey;
    forEach(result.Items || [], (item)=>{
      accumulated[item.itemId.S] = Number(item.amount.N)
    })
  } while (result.LastEvaluatedKey);
  return accumulated;
};

const getUserScoreThemes = (userInventory) =>  {
  return getAttributeScoreThemes(userInventory).concat(
    getRarityScoreThemes(userInventory));
}

const getAttributeScoreThemes = (userInventory) => {
  return map(data.attributes, (attribute) => {
    const items = map(getAttributeItems(attribute), (item) => {
      const rarity = data.rarities[item.rarity];
      return {
        amount: userInventory[item.id] || 0,
        score: (rarity) ? rarity.score: 0,
      };
    });
    const ownedItems = filter(items, (x) => x.amount > 0);
    const multiplier = ((min(items, (x)=> x.amount) || {}).amount || 0);
    const baseScore = reduce(ownedItems, (total, x)=> total + x.score, 0);
    return {
      score: multiplier * baseScore,
    };
  }) || [];
}

const getAttributeItems = (attributeKey) => {
  if (attributeKey) {
    return pick(data.itemTypes, (x) => contains(x.attributes, attributeKey));
  }
  return {};
}

const getRarityScoreThemes = (userInventory)=>{
  return map(data.rarities, (rarity) => {
    const items = map(getRarityItems(rarity.id), (item) => {
      return {
        amount: userInventory[item.id] || 0,
        score: (rarity) ? rarity.score: 0,
      };
    });
    const ownedItems = filter(items, (x) => x.amount > 0);
    const multiplier = ((min(items, (x)=> x.amount) || {}).amount || 0);
    const baseScore = reduce(ownedItems, (total, x)=> total + x.score, 0);
    return {
      score: multiplier * baseScore,
    };
  }) || [];
}

const getRarityItems = async (rarityKey)=>{
  if (rarityKey) {
    return pick(data.itemTypes, (x) => x.rarity === rarityKey);
  }
  return {};
}

const deleteWebhook = async (channelId, webhookId) => {
  const channelData = await getChannelData(channelId);
  const oldChannelData = JSON.parse(JSON.stringify(channelData));
  if (channelData.config && channelData.config.rewards) {
    channelData.config.rewards = omit(channelData.config.rewards, (x) => x.redemptionWebHookId === webhookId);
  }
  await updateChannelData(oldChannelData, channelData);
}

const revokeWebhook = async (channelData, webhookId, abortOn401)=>{
  const appToken = await getAppAccessToken();
  const response = await fetch('https://api.twitch.tv/helix/eventsub/subscriptions?id=' + webhookId, {
    method: 'DELETE',
    headers: {
      'Client-Id': process.env.client_id,
      'Authorization': 'Bearer ' + appToken.access_token
    }
  });
  if (!response.ok){
    if (response.status === 401 && !abortOn401){
      appAccessToken = null;
      return await revokeWebhook(channelData, webhookId, true);
    }
    throw new ApiError(await response.text(), response.status);
  }
}

const attemptSendUserChangeBroadcast = (channelId, userId)=> {
  const now = Date.now();
  const cooldown = channelBroadcastCooldowns[channelId];
  if (!cooldown || cooldown.time < now) {
    const userIds = (cooldown && cooldown.userIds)? uniq([...cooldown.userIds, userId]): [userId];
    channelBroadcastCooldowns[channelId] = { time: now + 1000 };
    sendUserChangeBroadcast(channelId, userIds);
  } else if (!cooldown.trigger) {
    cooldown.trigger = setTimeout(attemptSendUserChangeBroadcast, now - cooldown.time, channelId, userId);
  } else {
    cooldown.userIds = (cooldown.userIds)? uniq([...cooldown.userIds, userId]): [userId];
  }
}

const sendUserChangeBroadcast = (channelId, userIds) => {
  fetch('https://api.twitch.tv/helix/extensions/pubsub', {
    method: 'POST',
    headers: {
      'Client-Id': process.env.client_id,
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + makeServerToken(channelId),
    },
    body: JSON.stringify({
      message: JSON.stringify({
        type: 'userChange',
        userIds: userIds,
      }),
      broadcaster_id: channelId,
      target: ['broadcast'],
    })
  }).then(()=>{});
}

const makeServerToken = (channelId) => {
  const payload = {
    exp: Math.floor(Date.now() / 1000) + 30,
    user_id: process.env.owner_id, // extension owner ID for the call to Twitch PubSub
    role: 'external',
    channel_id: channelId,
    pubsub_perms: {
      send: ['broadcast'],
    },
  };
  return jsonwebtoken.sign(payload, Buffer.from(process.env.secret, 'base64'), { algorithm: 'HS256' });
}

export const handler = async (event) => {
  try {
    console.log(event);
    //let secret = getSecret();
    //let message = getHmacMessage(event);
    //let hmac = HMAC_PREFIX + getHmac(secret, message);  // Signature to compare
    if (event.headers[TWITCH_MESSAGE_SIGNATURE]) {
      let notification = JSON.parse(event.body);
      if (MESSAGE_TYPE_NOTIFICATION === event.headers[MESSAGE_TYPE]) {
        if (notification.subscription.type === "channel.channel_points_custom_reward_redemption.add") {
          await addSingleRandomInventoryItem(notification.event.broadcaster_user_id, notification.event.user_id, notification.subscription.id);
        }
        return getResponse(event, {statusCode: 204});
      } else if (MESSAGE_TYPE_VERIFICATION === event.headers[MESSAGE_TYPE]) {
        return getResponse(event, {
          statusCode: 200,
          body: notification.challenge,
          headers: {'Content-Type': 'text/plain'}
        });
      } else if (MESSAGE_TYPE_REVOCATION === event.headers[MESSAGE_TYPE]) {
        if (notification.subscription.type === "channel.channel_points_custom_reward_redemption.add") {
          await deleteWebhook(notification.subscription.condition.broadcaster_user_id, notification.subscription.id);
        }
        return getResponse(event, {statusCode: 204});
      } else {
        return getResponse(event, {statusCode: 204});
      }
    } else {
      return getResponse(event, {statusCode: 204});
    }
  } catch (err) {
    console.error(err);
    return getResponse(event, {statusCode: 204});
  }
};