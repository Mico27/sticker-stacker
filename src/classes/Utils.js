export default class Utils {

  static getItemRarityColor(rarity) {
    switch (rarity) {
      case 1:
        return '#75e0fa'
      case 2:
        return '#7dfc78'
      case 3:
        return '#ffea75'
      case 4:
        return '#FB8F67'
      case 5:
        return '#d45eff'
    }
    return '#ffffff';
  }

  static getItemRarityCode(rarity) {
    switch (rarity) {
      case 1:
        return 'Γ' //Gamma
      case 2:
        return 'Λ' //Lambda
      case 3:
        return 'Σ' //Sigma
      case 4:
        return 'Ω' //Omega
      case 5:
        return '★' //Shiny
    }
    return '?';
  }

  static getItemImage(itemUid) {
    return process.env.PUBLIC_URL + '/img/items/' + itemUid + '.png';
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