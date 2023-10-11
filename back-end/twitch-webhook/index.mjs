import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import {getResponse} from "../opt/nodejs/utils.mjs";
import {find, filter} from "underscore";
import { Buffer } from 'node:buffer';
import data from "../opt/nodejs/staticData.mjs";
const { createHmac, timingSafeEqual } = await import('node:crypto');

const client = new DynamoDBClient({ region: 'us-east-2' });

// Notification request headers
const TWITCH_MESSAGE_ID = 'Twitch-Eventsub-Message-Id'.toLowerCase();
const TWITCH_MESSAGE_TIMESTAMP = 'Twitch-Eventsub-Message-Timestamp'.toLowerCase();
const TWITCH_MESSAGE_SIGNATURE = 'Twitch-Eventsub-Message-Signature'.toLowerCase();
const MESSAGE_TYPE = 'Twitch-Eventsub-Message-Type'.toLowerCase();

// Notification message types
const MESSAGE_TYPE_VERIFICATION = 'webhook_callback_verification';
const MESSAGE_TYPE_NOTIFICATION = 'notification';
const MESSAGE_TYPE_REVOCATION = 'revocation';

// Prepend this string to the HMAC that's created from the message
const HMAC_PREFIX = 'sha256=';

const getSecret = () => {
  // TODO: Get secret from secure storage. This is the secret you pass
  // when you subscribed to the event.
  return process.env.secret;
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

const addSingleRandomInventoryItem = async (channelId, userId, pack) => {
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
}

export const handler = async (event) => {
  let secret = getSecret();
  let message = getHmacMessage(event);
  let hmac = HMAC_PREFIX + getHmac(secret, message);  // Signature to compare

  if (true === verifyMessage(hmac, event.headers[TWITCH_MESSAGE_SIGNATURE])) {
    console.log("signatures match");

    // Get JSON object from body, so you can process the message.
    let notification = JSON.parse(event.body);

    if (MESSAGE_TYPE_NOTIFICATION === event.headers[MESSAGE_TYPE]) {

      if (notification.subscription.type === "channel.channel_points_custom_reward_redemption.add"){
        addSingleRandomInventoryItem(notification.event.broadcaster_user_id, notification.event.user_id, null);
      }
      console.log(`Event type: ${notification.subscription.type}`);
      console.log(JSON.stringify(notification.event, null, 4));
      return getResponse(event, {statusCode: 204});
    }
    else if (MESSAGE_TYPE_VERIFICATION === event.headers[MESSAGE_TYPE]) {
      return getResponse(event, {statusCode: 200, body:notification.challenge, headers:{ 'Content-Type': 'text/plain' }});
    }
    else if (MESSAGE_TYPE_REVOCATION === event.headers[MESSAGE_TYPE]) {
      console.log(`${notification.subscription.type} notifications revoked!`);
      console.log(`reason: ${notification.subscription.status}`);
      console.log(`condition: ${JSON.stringify(notification.subscription.condition, null, 4)}`);
      return getResponse(event, {statusCode: 204});
    }
    else {
      console.log(`Unknown message type: ${event.headers[MESSAGE_TYPE]}`);
      return getResponse(event, {statusCode: 204});
    }
  }
  else {
    console.log('403');    // Signatures didn't match.
    return getResponse(event, {statusCode: 403});
  }
};