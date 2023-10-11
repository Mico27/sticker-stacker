export default class Utils {

  static getItemImage(itemId) {
    return process.env.PUBLIC_URL + '/img/items/' + itemId + '.png';
  }

  static deleteUserCache(userId, cache) {
    for (const key in cache)
      if (key.startsWith('[' + userId + ',') ||
        key.startsWith('[' + userId + ']'))
        delete cache[key];
  }

  static deleteTradeCache(userId, cache) {
    for (const key in cache)
      if (key.startsWith('[' + userId + ',') ||
        key.endsWith(',' + userId + ']'))
        delete cache[key];
  }
}