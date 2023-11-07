import {getResponse} from "../opt/nodejs/utils.mjs";

export const handler = async (event, context) => {
  return getResponse(event, {statusCode: 204});
};