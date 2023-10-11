import {getResponse} from "../opt/nodejs/utils.mjs";
import fetch from 'node-fetch';
import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
const client = new DynamoDBClient({ region: 'us-east-2' });

const getAuthCodeToken = async (code)=>{
  const params = new URLSearchParams();
  params.append('client_id', process.env.client_id);
  params.append('client_secret', process.env.client_secret);
  params.append('code', code);
  params.append('grant_type', 'authorization_code');
  params.append('redirect_uri', 'http://localhost/twitch-oauth-register');
  const response = await fetch('https://id.twitch.tv/oauth2/token', {method: 'POST', body: params});
  if (!response.ok){
    throw new Error(await response.text());
  }
  return await response.json();
}

const getUser = async (access_token)=>{
  const response = await fetch('https://api.twitch.tv/helix/users', {
    method: 'GET',
    headers: {
      authorization: 'Bearer ' + access_token
    }
  });
  if (!response.ok){
    throw new Error(await response.text());
  }
  return await response.json();
}

const registerUserToken = async (user, token)=>{
  await client.send(new UpdateItemCommand({
    "TableName": "Twitch-Ext-StickerStacker-channels",
    "Key": {
      "channelId": {
        "S": user.id
      }
    },
    "ExpressionAttributeNames": {
      "#A": "token"
    },
    "ExpressionAttributeValues": {
      ":A": {
        "S": JSON.stringify(token)
      }
    },
    "UpdateExpression": "SET #A = :A"
  }));
}

export const handler = async (event) => {
  try {
    const query = event.queryStringParameters;
    if (query && query.code) {
      const token = await getAuthCodeToken(query.code)
      const user = await getUser(token.access_token);
      await registerUserToken(user, token);
      return getResponse(event, {statusCode: 200, body: JSON.stringify(token)});
    } else if (query && query.error) {
      return getResponse(event, {statusCode: 200, body: JSON.stringify(query)});
    } else {
      return getResponse(event, {statusCode: 200, body: JSON.stringify({error: 'queryStringParameters not defined'})});
    }
  } catch (error){
    console.error(error);
    return getResponse(event, {statusCode: 200, body: JSON.stringify({error: error})});
  }
};