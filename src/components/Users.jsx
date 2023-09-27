import React from "react";
import PropTypes from "prop-types";
import * as _ from "underscore";
import LazyLoader from "./LazyLoader.jsx";
import UserSlot from "./UserSlot.jsx";
import Inventory from "./Inventory.jsx";
import Modal from "./Modal.jsx";
import ScoreDetails from "./ScoreDetails.jsx";
import Trade from "./Trade.jsx";

const USERS_PAGE_SIZE = 8;

export default class Users extends React.Component {

  static contextTypes = {
    apiHandler: PropTypes.object.isRequired,
    currentUser: PropTypes.object.isRequired,
  };

  constructor(props, context) {
    super(props, context);
    this.state = {
      users: [],
      inventoryOpen: false,
      tradeOpen: false,
      scoreDetailsOpen: false,
      selectedUserId: null,
    }
    this.onLoaded = this.onLoaded.bind(this);
    this.getPageData = this.getPageData.bind(this);
    this.onInventoryChanged = this.onInventoryChanged.bind(this);
    this.onListInventory = this.onListInventory.bind(this);
    this.onInventoryClose = this.onInventoryClose.bind(this);
    this.onTrade = this.onTrade.bind(this);
    this.onTradeClose = this.onTradeClose.bind(this);
    this.onScoreDetails = this.onScoreDetails.bind(this);
    this.onScoreDetailsClose = this.onScoreDetailsClose.bind(this);
  }

  componentDidMount() {
    this.context.apiHandler.onInventoryChangedEvent.addListener(this.onInventoryChanged);
  }

  componentWillUnmount() {
    this.context.apiHandler.onInventoryChangedEvent.removeListener(this.onInventoryChanged);
  }

  getPageData(currentPage) {
    return this.context.apiHandler.getUsers(currentPage * USERS_PAGE_SIZE, USERS_PAGE_SIZE)
  }

  onLoaded(data) {
    this.setState({
      users: data,
    });
  }

  onInventoryChanged() {
    if (this.lazyLoader) {
      this.lazyLoader.reset();
    }
  }

  onListInventory(userId) {
    this.setState({
      inventoryOpen: true,
      selectedUserId: userId,
    });
  }

  onInventoryClose() {
    this.setState({
      inventoryOpen: false,
    });
  }

  onTrade(userId) {
    this.setState({
      tradeOpen: true,
      selectedUserId: userId,
    });
  }

  onTradeClose() {
    this.setState({
      tradeOpen: false,
    });
  }

  onScoreDetails(userId) {
    this.setState({
      scoreDetailsOpen: true,
      selectedUserId: userId,
    });
  }

  onScoreDetailsClose() {
    this.setState({
      scoreDetailsOpen: false,
    });
  }

  render() {
    const {users, inventoryOpen, scoreDetailsOpen, tradeOpen, selectedUserId} = this.state;
    return (
      <div className="users">
        <div className="users-header">
          <h1>Users</h1>
        </div>
        <div className="users-container">
          {
            _.map(users, (user) => {
              return (<UserSlot user={user} onListInventory={this.onListInventory}
                                onTrade={this.onTrade} onScoreDetails={this.onScoreDetails}/>);
            })
          }
          <LazyLoader ref={(ref) => this.lazyLoader = ref} className="users-loader"
                      onLoaded={this.onLoaded} getPageData={this.getPageData}/>
        </div>
        {
          (selectedUserId) ?
            (inventoryOpen) ?
              <Modal hasCloseBtn={true} isOpen={inventoryOpen} onClose={this.onInventoryClose}>
                <Inventory userId={selectedUserId}/>
              </Modal> :
              (scoreDetailsOpen) ?
                <Modal hasCloseBtn={true} isOpen={scoreDetailsOpen} onClose={this.onScoreDetailsClose}>
                  <ScoreDetails userId={selectedUserId}/>
                </Modal> :
                (tradeOpen) ?
                  <Modal hasCloseBtn={true} isOpen={tradeOpen} onClose={this.onTradeClose}>
                    <Trade userId={selectedUserId} onCloseTrade={this.onTradeClose}/>
                  </Modal> : null : null
        }
      </div>
    );
  }
}