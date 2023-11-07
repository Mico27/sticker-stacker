import React from "react";
import PropTypes from "prop-types";
import * as _ from "underscore";
import LazyLoader from "./LazyLoader.jsx";
import Modal from "./Modal.jsx";
import Trade from "./Trade.jsx";
import PendingTradeSlot from "./PendingTradeSlot.jsx";

const PENDINGTRADES_PAGE_SIZE = 8;

export default class PendingTrades extends React.Component {

  static contextTypes = {
    apiHandler: PropTypes.object.isRequired,
    currentUser: PropTypes.object.isRequired,
  };

  constructor(props, context) {
    super(props, context);
    this.state = {
      pendingTrades: [],
      tradeOpen: false,
      selectedUserId: null,
    }
    this.onLoaded = this.onLoaded.bind(this);
    this.getPageData = this.getPageData.bind(this);
    this.onInventoryChanged = this.onInventoryChanged.bind(this);
    this.onTrade = this.onTrade.bind(this);
    this.onTradeClose = this.onTradeClose.bind(this);
  }

  componentDidMount() {
    this.context.apiHandler.onInventoryChangedEvent.addListener(this.onInventoryChanged);
    this.context.apiHandler.onTradeChangedEvent.addListener(this.onTradeChanged);
  }

  componentWillUnmount() {
    this.context.apiHandler.onInventoryChangedEvent.removeListener(this.onInventoryChanged);
    this.context.apiHandler.onTradeChangedEvent.removeListener(this.onTradeChanged);
  }

  getPageData(currentPage) {
    return this.context.apiHandler.getPendingTrades(this.props.userId || this.context.currentUser.userId,
      currentPage * PENDINGTRADES_PAGE_SIZE, PENDINGTRADES_PAGE_SIZE)
  }

  onLoaded(data) {
    this.setState({
      pendingTrades: data,
    });
  }

  onInventoryChanged() {
    if (this.lazyLoader) {
      this.lazyLoader.reset();
    }
  }

  onTradeChanged(){
    if (this.lazyLoader) {
      this.lazyLoader.reset();
    }
  }

  onTrade(toUserId) {
    this.setState({
      tradeOpen: true,
      selectedUserId: toUserId,
    });
  }

  onTradeClose() {
    this.setState({
      tradeOpen: false,
    });
  }

  render() {
    const {pendingTrades, tradeOpen, selectedUserId} = this.state;
    return (
      <div className="pending-trades">
        <div className="pending-trades-header">
          <h1>Pending trades</h1>
        </div>
        <div className="pending-trades-container">
          {
            _.map(pendingTrades, (pendingTrade) => {
              return (<PendingTradeSlot pendingTrade={pendingTrade} onTrade={this.onTrade} />);
            })
          }
          <LazyLoader ref={(ref) => this.lazyLoader = ref} className="pending-trades-loader"
                      onLoaded={this.onLoaded} getPageData={this.getPageData}/>
        </div>
        {
          (selectedUserId) ?
            (tradeOpen) ?
              <Modal hasCloseBtn={true} isOpen={tradeOpen} onClose={this.onTradeClose}>
                <Trade userId={selectedUserId} onCloseTrade={this.onTradeClose}/>
              </Modal> : null : null

        }
      </div>
    );
  }
}