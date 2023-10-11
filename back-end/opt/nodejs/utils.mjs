import jsonwebtoken from 'jsonwebtoken';

export const validateAuth = (auth) => {
  const bearerPrefix = 'Bearer ';
  if (!auth || !auth.startsWith(bearerPrefix)) return { err: 'Invalid authorization header' };
  try {
    const token = auth.substring(bearerPrefix.length);
    const secret = process.env.secret;
    return jsonwebtoken.verify(token, Buffer.from(secret, 'base64'), { algorithms: ['HS256'] });
  } catch (err) {
    return { err: 'Invalid JWT' };
  }
};

export const getResponse = (request, response)=> {
  response.headers = { ...(response.headers || {}),
    ['Access-Control-Allow-Origin']: request.headers.origin
  };
  return response;
}