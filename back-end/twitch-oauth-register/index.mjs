import {getResponse} from "../opt/nodejs/utils.mjs";
import fetch from 'node-fetch';
import { DynamoDBClient, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
const client = new DynamoDBClient({ region: 'us-east-2' });

const getAuthCodeToken = async (code)=>{
  const params = {
    'client_id': process.env.client_id,
    'client_secret': process.env.client_secret,
    'code': code,
    'grant_type': 'authorization_code',
    'redirect_uri': 'https://455ngs5mgk.execute-api.us-east-2.amazonaws.com/twitch-oauth-register',
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
  if (!response.ok){
    throw new Error(await response.text());
  }
  return await response.json();
}

const getUser = async (access_token)=>{
  const response = await fetch('https://api.twitch.tv/helix/users', {
    method: 'GET',
    headers: {
      'Client-Id': process.env.client_id,
      'Authorization': 'Bearer ' + access_token
    }
  });
  if (!response.ok){
    throw new Error(await response.text());
  }
  const json = await response.json();
  return (json && json.data)? json.data[0]: undefined;
}

const registerUserToken = async (user, token)=>{
  await client.send(new UpdateItemCommand({
    "TableName": "Twitch-Ext-StickerStacker-Channels",
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
    return getResponse(event, {statusCode: 200, body: JSON.stringify({error: error.message, stack: error.stack})});
  }
};