import jsonwebtoken from 'jsonwebtoken';
import {UpdateItemCommand} from "@aws-sdk/client-dynamodb";

export class ApiError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

export class RequireTwitchAuthError extends Error {
  constructor(message) {
    super(message);
  }
}

export const validateAuth = (auth) => {
  const bearerPrefix = 'Bearer ';
  if (!auth || !auth.startsWith(bearerPrefix)){
    throw new ApiError('Invalid authorization header', 401);
  }
  try {
    const token = auth.substring(bearerPrefix.length);
    const secret = process.env.secret;
    return jsonwebtoken.verify(token, Buffer.from(secret, 'base64'), { algorithms: ['HS256'] });
  } catch (err) {
    throw new ApiError('Invalid JWT', 401);
  }
};

export const getResponse = (request, response)=> {
  response.headers = { ...(response.headers || {}),
    ['Access-Control-Allow-Origin']: request.headers.origin
  };
  return response;
}


export const refreshToken = async (dbClient, channelId, token) => {
  const params = new URLSearchParams();
  params.append('client_id', process.env.client_id);
  params.append('client_secret', process.env.client_secret);
  params.append('grant_type', 'refresh_token');
  params.append('refresh_token', token.refresh_token);
  const response = await fetch('https://id.twitch.tv/oauth2/token', {method: 'POST', body: params});
  if (!response.ok){
    await registerUserToken(dbClient, channelId, null);
    throw new RequireTwitchAuthError();
  }
  const newToken = await response.json();
  await registerUserToken(dbClient, channelId, newToken);
  return newToken;
}

const registerUserToken = async (dbClient, channelId, token)=>{
  await dbClient.send(new UpdateItemCommand({
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
