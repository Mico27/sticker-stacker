import React from "react";
import PropTypes from "prop-types";
import TradeItemsSection from "./TradeItemsSection.jsx";
import TradeInventorySection from "./TradeInventorySection.jsx";
import * as _ from "underscore";

const MAX_TRADE_ARRAY_SIZE = 9;

export default class Trade extends React.Component {

  static contextTypes = {
    apiHandler: PropTypes.object.isRequired,
    currentUser: PropTypes.object.isRequired,
  };

  static propTypes = {
    userId: PropTypes.number,
    onCloseTrade: PropTypes.func,
  };

  constructor() {
    super();
    this.state = {
      trade: null,
    };
    this.onInventoryChanged = this.onInventoryChanged.bind(this);
    this.onTradeChanged = this.onTradeChanged.bind(this);
    this.onAcceptTrade = this.onAcceptTrade.bind(this);
    this.onCancelTrade = this.onCancelTrade.bind(this);
    this.onAddFromItem = this.onAddItem.bind(this, 'fromItems');
    this.onAddToItem = this.onAddItem.bind(this, 'toItems');
    this.onRemoveFromItem = this.onRemoveItem.bind(this, 'fromItems');
    this.onRemoveToItem = this.onRemoveItem.bind(this, 'toItems');
  }


  componentDidMount() {
    this.context.apiHandler.onInventoryChangedEvent.addListener(this.onInventoryChanged);
    this.context.apiHandler.onTradeChangedEvent.addListener(this.onTradeChanged);
    this.loadData();
  }

  componentWillUnmount() {
    this.context.apiHandler.onInventoryChangedEvent.removeListener(this.onInventoryChanged);
    this.context.apiHandler.onTradeChangedEvent.removeListener(this.onTradeChanged);
  }


  loadData(){
    const {userId} = this.props;
    const {apiHandler, currentUser} = this.context;
    apiHandler.getTrade(currentUser.id, userId).then((trade)=>{
      this.setState({
        trade: trade,
      });
    });
  }

  onInventoryChanged(userId){
    if (this.props.userId  === userId || this.context.currentUser.id === userId) {
      this.loadData();
    }
  }

  onTradeChanged(fromUserId, toUserId){
    if (this.props.userId  === fromUserId || this.context.currentUser.id === fromUserId ||
      this.props.userId  === toUserId || this.context.currentUser.id === toUserId) {
      this.loadData();
    }
  }

  onAcceptTrade(){
    const {trade} = this.state;
    const {apiHandler} = this.context;
    apiHandler.acceptTrade(trade.fromUserId, trade.toUserId, trade.fromItems, trade.toItems).then((newTrade)=>{
      if (newTrade.toAccepted || newTrade.fromAccepted){
        this.props.onCloseTrade();
      }
    });
  }

  onCancelTrade(){
    const {trade} = this.state;
    const {apiHandler} = this.context;
    apiHandler.cancelTrade(trade.fromUserId, trade.toUserId).then(()=>{
      this.props.onCloseTrade();
    });
  }

  onAddItem(property, item){
    const {trade} = this.state;
    let existingItem = _.find(trade[property], (x)=> x.itemId === item.itemId);
    if (!existingItem){
      if (trade[property].length < MAX_TRADE_ARRAY_SIZE) {
        trade[property].push({...item, amount: 1});
      }
    } else {
      if (item.amount > existingItem.amount) {
        existingItem.amount++;
      }
    }
    this.setState({
      trade: trade,
    });
  }

  onRemoveItem(property, item){
    const {trade} = this.state;
    let existingItem = _.find(trade[property], (x)=> x.itemId === item.itemId);
    if (existingItem){
      existingItem.amount--;
      if (existingItem.amount <= 0){
        const index = trade[property].indexOf(existingItem);
        if (index > -1) {
          trade[property].splice(index, 1);
        }
      }
    }
    this.setState({
      trade: trade,
    });
  }

  render() {
    const {trade} = this.state;
    if (!trade){
      return null;
    }
    return (
      <div className="trade">
        <div className="trade-header">
          <h1>Trade</h1>
          <div className="trade-buttons">
            <button type="button" onClick={this.onAcceptTrade}>Accept</button>
            <button type="button" onClick={this.onCancelTrade}>Cancel</button>
          </div>
        </div>
        <div className="trade-container">
          <div className="trade-items-sections">
            <TradeItemsSection size={MAX_TRADE_ARRAY_SIZE} userId={trade.fromUserId}
                               items={trade.fromItems} onRemoveItem={this.onRemoveFromItem}/>
            <TradeItemsSection size={MAX_TRADE_ARRAY_SIZE} userId={trade.toUserId}
                               items={trade.toItems} onRemoveItem={this.onRemoveToItem}/>
          </div>
          <div className="trade-inventories-sections">
            <TradeInventorySection userId={trade.fromUserId} onAddItem={this.onAddFromItem}/>
            <TradeInventorySection userId={trade.toUserId} onAddItem={this.onAddToItem}/>
          </div>
        </div>
      </div>)
  }
}