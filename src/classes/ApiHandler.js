import * as _ from "underscore";
import EventListener from "./EventListener";
import Utils from "./Utils";
const data = require('../data/mockupData.json');

const CURRENT_USER_ID = 1;

export default class ApiHandler {
  constructor() {
    this.onInventoryChangedEvent = new EventListener();
    this.onTradeChangedEvent = new EventListener();
    this.inventoryItems = {};
    this.pendingTrades = {};
    this.getCurrentUser = _.memoize(this.getCurrentUser, this.memoizeHash);
    this.getUser = _.memoize(this.getUser, this.memoizeHash);
    this.getInventoryItems = _.memoize(this.getInventoryItems, this.memoizeHash);
    this.getAllScoreThemes = _.memoize(this.getAllScoreThemes, this.memoizeHash);
    this.getScoreThemes = _.memoize(this.getScoreThemes, this.memoizeHash);
    this.getScoreItems = _.memoize(this.getScoreItems, this.memoizeHash);
    this.getUsers = _.memoize(this.getUsers, this.memoizeHash);
    this.getPendingTrades = _.memoize(this.getPendingTrades, this.memoizeHash);
    this.getTrade = _.memoize(this.getTrade, this.memoizeHash);
    this.onInventoryChanged = _.throttle(this.onInventoryChanged, 1000);

  }

  memoizeHash(...args){
    return JSON.stringify([].concat(args));
  }

  getCurrentUser() {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(_.find(data.users, (x) => x.id === CURRENT_USER_ID));
      }, 1000);
    });
  }

  getUser(userId){
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(_.find(data.users, (x)=> x.id === userId));
      }, 1000);
    });
  }

  getInventoryItems(userId, offset, limit) {
    return new Promise((resolve)=>{
      setTimeout(() => {
        const filteredItems = this.inventoryItems[userId] || [];
        if (limit > 0) {
          resolve({data: filteredItems.slice(offset, limit + offset), offset: offset});
        } else if (offset > 0) {
          resolve({data: filteredItems.slice(offset), offset: offset});
        } else {
          resolve({data: filteredItems, offset: offset});
        }
      }, 1000);
    });
  }

  getScoreItems(userId) {
    return new Promise((resolve)=>{
      setTimeout(() => {
        resolve(_.map(_.groupBy(this.inventoryItems[userId], 'rarity'), (items)=> {
          return {
            rarity: items[0].rarity,
            score: items[0].score,
            amount: _.reduce(items, (total, item)=>{
              return total + item.amount;
            }, 0),
            shiny: items[0].shiny,
          };
        }));
      }, 1000);
    });
  }

  getAllScoreThemes(userId){
    return _.sortBy(_.filter(_.map(data.themes, (theme) => {
      const items = _.map(this.getThemeRequiredItems(theme), (item) => {
        const ownedItem = _.find(this.inventoryItems[userId] || [], (x) => item.id === x.itemId);
        return {
          id: item.id,
          uid: item.uid,
          amount: (ownedItem) ? ownedItem.amount : 0,
          shiny: (ownedItem) ? ownedItem.shiny : false,
        };
      });
      const ownedItems = _.sortBy(_.filter(items, (x) => x.amount > 0), (x) => -x.amount);
      const reqCount = theme.reqCount || items.length;
      return {
        id: theme.id,
        name: theme.name,
        score: theme.score,
        amount: Math.min(_.reduce(items, (total, item) => {
          return total + ((theme.reqUnique) ? Math.min(item.amount, 1) : item.amount);
        }, 0), reqCount),
        reqCount: reqCount,
        reqUnique: theme.reqUnique,
        items: ownedItems,
      };
    }), (x) => x.amount > 0), (x) => (x.amount === x.reqCount) ? -x.score : 0) || [];
  }

  getScoreThemes(userId, offset, limit) {
    return new Promise((resolve)=>{
      setTimeout(() => {
        const allScoreThemes = this.getAllScoreThemes(userId);
        if (limit > 0) {
          resolve({data: allScoreThemes.slice(offset, limit + offset), offset: offset});
        } else if (offset > 0) {
          resolve({data: allScoreThemes.slice(offset), offset: offset});
        } else {
          resolve({data: allScoreThemes, offset: offset});
        }
        resolve();
      }, 1000);
    });
  }

  getUsers(offset, limit) {
    return new Promise((resolve)=>{
      setTimeout(() => {
        const filteredUsers = _.filter(data.users, (user)=> user.id !== CURRENT_USER_ID);
        if (limit > 0) {
          resolve({data: filteredUsers.slice(offset, limit + offset), offset: offset});
        } else if (offset > 0) {
          resolve({data: filteredUsers.slice(offset), offset: offset});
        } else {
          resolve({data: filteredUsers, offset: offset});
        }
      }, 1000);
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
          const toUser = _.find(data.users, (x)=> x.id === toUserId);
          existingTrade = {
            fromUserId: fromUserId,
            toUserId: toUserId,
            toUserName: (toUser)? toUser.name: '???',
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

  onInventoryChanged(userId){
    if (userId === CURRENT_USER_ID){
      this.getCurrentUser.cache = {};
    } else {
      this.getUsers.cache = {};
    }
    Utils.deleteUserCache(userId, this.getUser.cache);
    Utils.deleteUserCache(userId, this.getInventoryItems.cache);
    Utils.deleteUserCache(userId, this.getAllScoreThemes.cache);
    Utils.deleteUserCache(userId, this.getScoreThemes.cache);
    Utils.deleteUserCache(userId, this.getScoreItems.cache);
    Utils.deleteUserCache(userId, this.getPendingTrades.cache);
    Utils.deleteTradeCache(userId, this.getTrade.cache);
    this.onInventoryChangedEvent.triggerEvent(userId);
  }

  onTradeChanged(fromUserId, toUserId){
    Utils.deleteTradeCache(fromUserId, this.getTrade.cache);
    Utils.deleteTradeCache(toUserId, this.getTrade.cache);
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
        const toUser = _.find(data.users, (x)=> x.id === toUserId);
        this.pendingTrades.length = (this.pendingTrades.length || 0) + 1;
        existingTrade = {
          id: this.pendingTrades.length,
          fromUserId: fromUserId,
          toUserId: toUserId,
          toUserName: (toUser)? toUser.name: '???',
          fromItems: [],
          toItems: [],
          fromAccepted: true,
          toAccepted: false,
        };
        this.pendingTrades[fromUserId].push(existingTrade);
        this.pendingTrades[toUserId].push(existingTrade);
      }

      existingTrade.fromValid = this.validateTradeItems(fromUserId, fromItems);
      existingTrade.toValid = this.validateTradeItems(toUserId, toItems);

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
          this.onInventoryChanged(fromUserId);
          this.onInventoryChanged(toUserId);
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
    const userInventory = this.inventoryItems[userId] || [];
    return !_.some(items, (x)=> !_.some(userInventory, (y)=> x.itemId === y.itemId && x.amount <= y.amount));
  }

  removeTradedItems(userId, items){
    const userInventory = this.inventoryItems[userId];
    _.forEach(items, (x)=>{
      const item = _.find(userInventory, (y)=> y.itemId === x.itemId);
      if (item){
        item.amount -= x.amount;
        if (item.amount <= 0){
          const index = userInventory.indexOf(item);
          if (index > -1) {
            userInventory.splice(index, 1);
          }
        }
      }
    });
  }

  addTradedItems(userId, items){
    const userInventory = this.inventoryItems[userId];
    _.forEach(items, (x)=>{
      const item = _.find(userInventory, (y)=> y.itemId === x.itemId);
      if (item){
        item.amount += x.amount;
      } else {
        this.inventoryItems.length = (this.inventoryItems.length || 0) + 1;
        userInventory.push({
          id: this.inventoryItems.length,
          itemId: x.itemId,
          itemUid: x.itemUid,
          name: x.name,
          rarity: x.rarity,
          attributes: x.attributes,
          userId: userId,
          amount: x.amount,
          shiny: x.shiny,
          score: x.score,
        });
      }
    });
  }

  addRandomInventoryItems(amount, userId){
    for (let i = 1; i <= amount; i++) {
      this.addSingleRandomInventoryItem(userId);
    }
    this.updateScore(userId);
    this.onInventoryChanged(userId);
  }

  addSingleRandomInventoryItem(userId){
    const roll = Math.random();
    let acc = 0;
    const rarity = _.find(data.rarities, (x)=>{
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
    const itemTypes = _.filter(data.itemTypes, (x)=> x.rarity === rarity.id);
    if (!itemTypes.length){
      console.log('item types not found for rarity: ' + rarity.id);
      return;
    }
    const itemType = itemTypes[(Math.floor(Math.random() * itemTypes.length))];
    if (!this.inventoryItems[userId]){
      this.inventoryItems[userId] = [];
    }
    const existingInventoryItem = _.find(this.inventoryItems[userId], (x)=> x.itemId === itemType.id);
    if (existingInventoryItem){
      existingInventoryItem.amount += 1;
    } else {
      this.inventoryItems.length = (this.inventoryItems.length || 0) + 1;
      this.inventoryItems[userId].push({
        id: this.inventoryItems.length,
        itemId: itemType.id,
        itemUid: itemType.uid,
        name: itemType.name,
        rarity: itemType.rarity,
        attributes: (itemType.attributes)? _.filter(data.attributes, (x)=> itemType.attributes.includes(x.id)): [],
        userId: userId,
        amount: 1,
        shiny: rarity.shiny,
        score: rarity.score,
      });
    }
  }

  updateScore(userId){
    const user = _.find(data.users, (x)=> x.id === userId);
    user.score = _.reduce(this.inventoryItems[userId] || [], (total, x)=> {
      return total + (x.amount * x.score);
    }, 0);
    user.score += this.getThemesBonuses(userId);
  }

  getThemesBonuses(userId){
    let bonusScore = 0;
    _.forEach(data.themes, (theme)=>{
      bonusScore += this.getSingleThemeBonus(theme, userId);
    });
    return bonusScore;
  }

  getSingleThemeBonus(theme, userId){
    return (this.canGetBonusScore(theme, userId))? theme.score: 0;
  }

  canGetBonusScore(theme, userId){
    const requiredItems = this.getThemeRequiredItems(theme);
    if (requiredItems && requiredItems.length > 0) {
      if (theme.reqCount) {
        const items = _.filter(this.inventoryItems[userId] || [], (x) => _.some(requiredItems, (y) => y.id === x.itemId));
        const itemCount = (theme.reqUnique)? items.length: _.reduce(items, (total, x) => {
          return total + x.amount;
        }, 0);
        return (itemCount >= theme.reqCount);
      } else {
        return (_.every(requiredItems, (x) => _.some(this.inventoryItems[userId] || [], (y) => y.itemId === x.id)));
      }
    }
    return false;
  }

  getThemeRequiredItems(theme){
    if (theme) {
      const requirement = data.requirements[theme.requirement - 1];
      if (requirement) {
        switch (requirement.type) {
          case "attribute":
            const attribute = _.find(data.attributes, (x) => x[requirement.name] === requirement.value);
            return _.filter(data.itemTypes, (x) => _.contains(x.attributes, attribute.id));
          case "rarity":
            const rarity = _.find(data.rarities, (x) => x[requirement.name] === requirement.value);
            return _.filter(data.itemTypes, (x) => x.rarity === rarity.id);
          case "itemType":
            return _.filter(data.itemTypes, (x) => x[requirement.name] === requirement.value);
        }
      }
    }
    return [];
  }
}