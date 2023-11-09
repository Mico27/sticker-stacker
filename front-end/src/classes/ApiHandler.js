import * as _ from "underscore";
import EventListener from "./EventListener";
import Utils from "./Utils";
const data = require('../data/staticData.json');

const DOMAIN = 'https://455ngs5mgk.execute-api.us-east-2.amazonaws.com';

export default class ApiHandler {
  constructor() {
    this.onInventoryChangedEvent = new EventListener();
    this.onTradeChangedEvent = new EventListener();
    this.auth = null;
    this.pendingTrades = {};
    this.getCurrentUser = _.memoize(this.getCurrentUser, this.memoizeHash);
    this.getUser = _.memoize(this.getUser, this.memoizeHash);
    this.loadUsers = _.memoize(this.loadUsers, this.memoizeHash);
    this.getUsers = _.memoize(this.getUsers, this.memoizeHash);
    this.loadInventoryItems = _.memoize(this.loadInventoryItems, this.memoizeHash);
    this.getInventoryItems = _.memoize(this.getInventoryItems, this.memoizeHash);
    this.getAllScoreThemes = _.memoize(this.getAllScoreThemes, this.memoizeHash);
    this.getScoreThemes = _.memoize(this.getScoreThemes, this.memoizeHash);
    this.getScoreItems = _.memoize(this.getScoreItems, this.memoizeHash);
    this.getPendingTrades = _.memoize(this.getPendingTrades, this.memoizeHash);
    this.getTrade = _.memoize(this.getTrade, this.memoizeHash);
  }

  memoizeHash(...args){
    return JSON.stringify([].concat(args));
  }

  getCurrentUser() {
    return new Promise((resolve) => {
      fetch(DOMAIN + '/user-get', {
        method: 'GET',
        headers: {
          authorization: 'Bearer ' + this.auth.token
        },
      }).then((res) => {
        if (res.ok) {
          return res.json();
        } else {
          res.text().then((error) => {
            console.log(error);
            resolve(null);
          });
        }
      }).then((user) => {
        this.currentUserId = (user)? user.userId: 0;
        resolve(user);
      }).catch((error) => {
        console.log(error);
        resolve(null);
      });
    });
  }

  getUser(userId){
    if (!userId){
      return this.getCurrentUser();
    }
    return new Promise((resolve) => {
      fetch(DOMAIN + '/user-get?user_id=' + userId, {
        method: 'GET',
        headers: {
          authorization: 'Bearer ' + this.auth.token
        },
      }).then((res) => {
        if (res.ok) {
          return res.json();
        } else {
          res.text().then((error) => {
            console.log(error);
            resolve(null);
          });
        }
      }).then((user) => {
        resolve(user);
      }).catch((error) => {
        console.log(error);
        resolve(null);
      });
    });
  }

  loadUsers(sortKey, nameSearch, exclusiveStartKey) {
    return new Promise((resolve) => {
      fetch(DOMAIN + '/users-query', {
        method: 'POST',
        headers: {
          authorization: 'Bearer ' + this.auth.token
        },
        body: JSON.stringify({
          sortKey: sortKey,
          nameSearch: nameSearch,
          exclusiveStartKey: exclusiveStartKey,
        })
      }).then((res) => {
        if (res.ok) {
          return res.json();
        } else {
          res.text().then((error) => {
            console.log(error);
            resolve(null);
          });
        }
      }).then((users) => {
        resolve(users);
      }).catch((error) => {
        console.log(error);
        resolve(null);
      });
    });
  }

  getUsers(sortKey, nameSearch, offset, limit) {
    return new Promise((resolve)=>{
      this.loadUsers(sortKey, nameSearch).then((result)=>{
        const users = (result)? result.items || []: [];
        if (limit > 0) {
          resolve({data: users.slice(offset, limit + offset), offset: offset});
        } else if (offset > 0) {
          resolve({data: users.slice(offset), offset: offset});
        } else {
          resolve({data: users, offset: offset});
        }
      });
    });
  }

  loadInventoryItems(userId) {
    return new Promise((resolve) => {
      fetch(DOMAIN + '/inventory-query?user_id=' + userId, {
        method: 'GET',
        headers: {
          authorization: 'Bearer ' + this.auth.token
        },
      }).then((res) => {
        if (res.ok) {
          return res.json();
        } else {
          res.text().then((error) => {
            console.log(error);
            resolve(null);
          });
        }
      }).then((inventory) => {
        resolve(_.map(inventory, (amount, itemId)=>{
          const itemType = data.itemTypes[itemId]  || {};
          const rarity = data.rarities[itemType.rarity] || {};
          return {
            itemId: itemId,
            amount: amount,
            name: itemType.name,
            rarity: itemType.rarity,
            color: rarity.color,
            code: rarity.code,
            attributes: _.map(itemType.attributes || [], (y)=> data.attributes[y]),
            shiny: rarity.shiny,
            score: rarity.score,
          }
        }));
      }).catch((error) => {
        console.log(error);
        resolve(null);
      });
    });
  }

  getInventoryItems(userId, offset, limit) {
    return new Promise((resolve)=>{
      this.loadInventoryItems(userId).then((inventoryItems)=>{
        if (limit > 0) {
          resolve({data: inventoryItems.slice(offset, limit + offset), offset: offset});
        } else if (offset > 0) {
          resolve({data: inventoryItems.slice(offset), offset: offset});
        } else {
          resolve({data: inventoryItems, offset: offset});
        }
      });
    });
  }

  getScoreItems(userId) {
    return new Promise((resolve) => {
      this.loadInventoryItems(userId).then((inventoryItems)=>{
        resolve(_.sortBy(_.map(_.groupBy(inventoryItems, 'rarity'), (items) => {
          const rarity = data.rarities[items[0].rarity];
          return {
            rarity: rarity.id,
            order: rarity.order,
            color: rarity.color,
            code: rarity.code,
            score: items[0].score,
            amount: _.reduce(items, (total, item) => {
              return total + item.amount;
            }, 0),
            shiny: items[0].shiny,
          };
        }), 'order'));
      });
    });
  }

  getAllScoreThemes(userId) {
    return new Promise((resolve) => {
      this.loadInventoryItems(userId).then((inventoryItems) => {
        resolve(_.sortBy(_.filter(
          this.getAttributeScoreThemes(inventoryItems).concat(
            this.getRarityScoreThemes(inventoryItems)),
          (x) => x.amount > 0), (x) => (x.amount === x.reqCount) ? -x.score : 0) || []);
      });
    });
  }

  getAttributeScoreThemes(inventoryItems){
    return _.map(data.attributes, (attribute) => {
      const items = _.map(this.getAttributeItems(attribute.id), (item) => {
        const ownedItem = _.find(inventoryItems, (x) => item.id === x.itemId);
        const rarity = data.rarities[item.rarity];
        return {
          itemId: item.id,
          amount: (ownedItem) ? ownedItem.amount : 0,
          score: (rarity) ? rarity.score: 0,
          shiny: (rarity) ? rarity.shiny : false,
        };
      });
      const ownedItems = _.sortBy(_.filter(items, (x) => x.amount > 0), (x) => -x.amount);
      const multiplier = ((_.min(items, (x)=> x.amount) || {}).amount || 0);
      const baseScore = _.reduce(ownedItems, (total, x)=> total + x.score, 0);
      return {
        name: attribute.theming,
        multiplier: multiplier,
        baseScore: baseScore,
        score: multiplier * baseScore,
        amount: ownedItems.length,
        reqCount: items.length,
        items: ownedItems,
      };
    }) || [];
  }

  getAttributeItems(attributeKey){
    if (attributeKey) {
      return _.pick(data.itemTypes, (x) => _.contains(x.attributes, attributeKey));
    }
    return {};
  }

  getRarityScoreThemes(inventoryItems){
    return _.map(data.rarities, (rarity) => {
      const items = _.map(this.getRarityItems(rarity.id), (item) => {
        const ownedItem = _.find(inventoryItems, (x) => item.id === x.itemId);
        return {
          itemId: item.id,
          amount: (ownedItem) ? ownedItem.amount : 0,
          score: (rarity) ? rarity.score: 0,
          shiny: (rarity) ? rarity.shiny : false,
        };
      });
      const ownedItems = _.sortBy(_.filter(items, (x) => x.amount > 0), (x) => -x.amount);
      const multiplier = ((_.min(items, (x)=> x.amount) || {}).amount || 0);
      const baseScore = _.reduce(ownedItems, (total, x)=> total + x.score, 0);
      return {
        name: rarity.theming,
        multiplier: multiplier,
        baseScore: baseScore,
        score: multiplier * baseScore,
        amount: ownedItems.length,
        reqCount: items.length,
        items: ownedItems,
      };
    }) || [];
  }

  getRarityItems(rarityKey){
    if (rarityKey) {
      return _.pick(data.itemTypes, (x) => x.rarity === rarityKey);
    }
    return {};
  }

  getScoreThemes(userId, offset, limit) {
    return new Promise((resolve)=>{
      this.getAllScoreThemes(userId).then((scoreThemes)=>{
        if (limit > 0) {
          resolve({data: scoreThemes.slice(offset, limit + offset), offset: offset});
        } else if (offset > 0) {
          resolve({data: scoreThemes.slice(offset), offset: offset});
        } else {
          resolve({data: scoreThemes, offset: offset});
        }
        resolve();
      });
    });
  }

  getPendingTrades(userId, offset, limit) {
    return new Promise((resolve)=>{
      setTimeout(() => {
        const userTrades = this.pendingTrades[userId] || [];
        if (limit > 0) {
          resolve({data: userTrades.slice(offset, limit + offset), offset: offset});
        } else if (offset > 0) {
          resolve({data: userTrades.slice(offset), offset: offset});
        } else {
          resolve({data: userTrades, offset: offset});
        }
      }, 1000);
    });
  }

  getTrade(fromUserId, toUserId){
    return new Promise((resolve)=>{
      setTimeout(() => {
        const userTrades = this.pendingTrades[fromUserId] || [];
        let existingTrade = _.find(userTrades, (userTrade)=>(userTrade.toUserId === toUserId || userTrade.fromUserId === toUserId));
        if (!existingTrade){
          const toUser = _.find(this.users, (x)=> x.id === toUserId);
          existingTrade = {
            fromUserId: fromUserId,
            toUserId: toUserId,
            toUserName: (toUser)? toUser.display_name: '???',
            fromItems: [],
            toItems: [],
            fromAccepted: false,
            toAccepted: false,
          }
        }
        resolve(existingTrade);
      }, 1000);
    });
  }

  onInventoryChanged(userIds){
    this.loadUsers.cache = {};
    this.getUsers.cache = {};
    _.forEach(userIds, (userId)=>{
      if (userId === this.currentUserId){
        this.getCurrentUser.cache = {};
      }
      Utils.deleteUserCache(userId, this.getUser.cache);
      Utils.deleteUserCache(userId, this.loadInventoryItems.cache);
      Utils.deleteUserCache(userId, this.getInventoryItems.cache);
      Utils.deleteUserCache(userId, this.getAllScoreThemes.cache);
      Utils.deleteUserCache(userId, this.getScoreThemes.cache);
      Utils.deleteUserCache(userId, this.getScoreItems.cache);
      Utils.deleteUserCache(userId, this.getPendingTrades.cache);
    });
    this.onInventoryChangedEvent.triggerEvent(userIds);
  }

  onTradeChanged(fromUserId, toUserId){
    Utils.deleteUserCache(fromUserId, this.getTrade.cache);
    Utils.deleteUserCache(toUserId, this.getTrade.cache);
    Utils.deleteUserCache(fromUserId, this.getPendingTrades.cache);
    Utils.deleteUserCache(toUserId, this.getPendingTrades.cache);
    this.onTradeChangedEvent.triggerEvent(fromUserId, toUserId);
  }

  acceptTrade(fromUserId, toUserId, fromItems, toItems){
    return new Promise((resolve)=> {
      let userTrades = this.pendingTrades[fromUserId];
      if (!userTrades) {
        this.pendingTrades[fromUserId] = [];
      }
      userTrades = this.pendingTrades[toUserId];
      if (!userTrades) {
        this.pendingTrades[toUserId] = [];
      }
      let existingTrade = _.find(userTrades, (userTrade) => (userTrade.toUserId === toUserId || userTrade.fromUserId === toUserId));
      if (!existingTrade) {
        const toUser = _.find(this.users, (x)=> x.id === toUserId);
        this.pendingTrades.length = (this.pendingTrades.length || 0) + 1;
        existingTrade = {
          id: this.pendingTrades.length,
          fromUserId: fromUserId,
          toUserId: toUserId,
          toUserName: (toUser)? toUser.display_name: '???',
          fromItems: [],
          toItems: [],
          fromAccepted: true,
          toAccepted: false,
        };
        this.pendingTrades[fromUserId].push(existingTrade);
        this.pendingTrades[toUserId].push(existingTrade);
      }

      //existingTrade.fromValid = this.validateTradeItems(fromUserId, fromItems);
      //existingTrade.toValid = this.validateTradeItems(toUserId, toItems);

      if (this.tradeChanged(existingTrade, fromItems, toItems)) {
        existingTrade.fromItems = fromItems;
        existingTrade.toItems = toItems;
        existingTrade.fromAccepted = false;
        existingTrade.toAccepted = false;
      }
      if (existingTrade.fromValid && existingTrade.toValid) {
        if (fromUserId === existingTrade.fromUserId) {
          existingTrade.fromAccepted = true;
        } else if (fromUserId === existingTrade.toUserId) {
          existingTrade.toAccepted = true;
        }
        if (existingTrade.fromAccepted && existingTrade.toAccepted) {
          let index = this.pendingTrades[fromUserId].indexOf(existingTrade);
          if (index > -1) {
            this.pendingTrades[fromUserId].splice(index, 1);
          }
          index = this.pendingTrades[toUserId].indexOf(existingTrade);
          if (index > -1) {
            this.pendingTrades[toUserId].splice(index, 1);
          }
          this.removeTradedItems(fromUserId, existingTrade.fromItems);
          this.removeTradedItems(toUserId, existingTrade.toItems);
          this.addTradedItems(fromUserId, existingTrade.toItems);
          this.addTradedItems(toUserId, existingTrade.fromItems);
          //this.onInventoryChanged(fromUserId);
          //this.onInventoryChanged(toUserId);
        }
      }
      this.onTradeChanged(fromUserId, toUserId);
      resolve(existingTrade);
    });
  }

  cancelTrade(fromUserId, toUserId) {
    return new Promise((resolve) => {
      let userTrades = this.pendingTrades[fromUserId];
      if (!userTrades) {
        this.pendingTrades[fromUserId] = [];
      }
      userTrades = this.pendingTrades[toUserId];
      if (!userTrades) {
        this.pendingTrades[toUserId] = [];
      }
      let existingTrade = _.find(userTrades, (userTrade) => (userTrade.toUserId === toUserId || userTrade.fromUserId === toUserId));
      if (existingTrade) {
        let index = this.pendingTrades[fromUserId].indexOf(existingTrade);
        if (index > -1) {
          this.pendingTrades[fromUserId].splice(index, 1);
        }
        index = this.pendingTrades[toUserId].indexOf(existingTrade);
        if (index > -1) {
          this.pendingTrades[toUserId].splice(index, 1);
        }
        this.onTradeChanged(fromUserId, toUserId);
        resolve(existingTrade);
      }
    });
  }

  tradeChanged(existingTrade, fromItems, toItems){
    return existingTrade.fromItems.length !== fromItems.length ||
    existingTrade.toItems.length !== toItems.length ||
    _.some(existingTrade.fromItems, (x)=> !_.some(fromItems, (y)=> x.itemId === y.itemId && x.amount === y.amount)) ||
      _.some(fromItems, (x)=> !_.some(existingTrade.fromItems, (y)=> x.itemId === y.itemId && x.amount === y.amount)) ||
      _.some(existingTrade.toItems, (x)=> !_.some(toItems, (y)=> x.itemId === y.itemId && x.amount === y.amount)) ||
      _.some(toItems, (x)=> !_.some(existingTrade.toItems, (y)=> x.itemId === y.itemId && x.amount === y.amount));

  }

  validateTradeItems(userId, items){
    return new Promise((resolve) => {
      this.loadInventoryItems(userId).then((userInventory)=>{
        resolve(!_.some(items, (x) => !_.some(userInventory, (y) => x.itemId === y.itemId && x.amount <= y.amount)));
      });
    });
  }

  removeTradedItems(userId, items) {
    this.loadInventoryItems(userId).then((userInventory) => {
      _.forEach(items, (x) => {
        const item = _.find(userInventory, (y) => y.itemId === x.itemId);
        if (item) {
          item.amount -= x.amount;
          if (item.amount <= 0) {
            const index = userInventory.indexOf(item);
            if (index > -1) {
              userInventory.splice(index, 1);
            }
          }
        }
      });
    });
  }

  addTradedItems(userId, items) {
    this.loadInventoryItems(userId).then((userInventory) => {
      _.forEach(items, (x) => {
        const item = _.find(userInventory, (y) => y.itemId === x.itemId);
        if (item) {
          item.amount += x.amount;
        } else {
          userInventory.push({
            itemId: x.itemId,
            amount: x.amount,
          });
        }
      });
    });
  }
}