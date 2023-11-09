export default class Utils {

  static getItemImage(itemId) {
    return process.env.PUBLIC_URL + '/img/items/' + itemId + '.png';
  }

  static deleteUserCache(userId, cache) {
    for (const key in cache)
      if (key.indexOf(userId) !== -1)
        delete cache[key];
  }
}