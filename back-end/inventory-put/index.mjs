import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import {validateAuth, getResponse} from "../opt/nodejs/utils.mjs";
import data from "../opt/nodejs/staticData.mjs";
import {find, filter} from "underscore";

const client = new DynamoDBClient({ region: 'us-east-2' });

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

export const handler = async (event, context) => {
  const auth = validateAuth(event.headers.Authorization);
  if (auth.err) return getResponse(event, {statusCode: 401, body: JSON.stringify(auth)});
  const body = JSON.parse(event.body);
  await addSingleRandomInventoryItem(auth.channel_id, body.userId, body.pack);
  return getResponse(event, {statusCode: 200, body: JSON.stringify(true)});
};