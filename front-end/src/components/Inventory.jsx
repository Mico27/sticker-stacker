import React from "react";
import PropTypes from "prop-types";
import * as _ from "underscore";
import InventorySlot from "./InventorySlot.jsx";
import LazyLoader from "./LazyLoader.jsx";
import Utils from "../classes/Utils";

const INVENTORY_PAGE_SIZE = 16;

export default class Inventory extends React.Component {

  static contextTypes = {
    apiHandler: PropTypes.object.isRequired,
    currentUser: PropTypes.object.isRequired,
  };

  static propTypes = {
    userId: PropTypes.number,
  };

  constructor(props, context) {
    super(props, context);
    this.state = {
      items: [],
      user: null,
    }
    this.onLoaded = this.onLoaded.bind(this);
    this.getPageData = this.getPageData.bind(this);
    this.onInventoryChanged = this.onInventoryChanged.bind(this);
    this.onAddStickers = this.onAddStickers.bind(this);
    this.onRefresh = this.onRefresh.bind(this);
  }

  componentDidMount() {
    this.context.apiHandler.onInventoryChangedEvent.addListener(this.onInventoryChanged);
    this.loadUser();
  }

  componentWillUnmount() {
    this.context.apiHandler.onInventoryChangedEvent.removeListener(this.onInventoryChanged);
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    if (prevProps.userId !== this.props.userId && this.lazyLoader) {
      this.loadUser();
      this.lazyLoader.reset();
    }
  }

  loadUser() {
    this.context.apiHandler.getUser(this.props.userId || this.context.currentUser.userId).then((user) => {
      this.setState({
        user: user,
      });
    })
  }

  getPageData(currentPage) {
    return this.context.apiHandler.getInventoryItems(this.props.userId || this.context.currentUser.userId,
      currentPage * INVENTORY_PAGE_SIZE, INVENTORY_PAGE_SIZE)
  }

  onLoaded(data) {
    this.setState({
      items: data,
    });
  }

  onAddStickers() {
    this.context.apiHandler.addRandomInventoryItems(1, this.props.userId || this.context.currentUser.userId);
  }

  onInventoryChanged(userIds) {
    if (this.lazyLoader && _.contains(userIds, this.props.userId || this.context.currentUser.userId)) {
      this.lazyLoader.reset();
    }
  }

  onRefresh(){
    const apiHandler = this.context.apiHandler;
    const userId = this.props.userId || this.context.currentUser.userId;
    apiHandler.onInventoryChanged([userId]);
  }

  render() {
    const {items, user} = this.state;
    const lastItemCount = this.lastItemCount || 0;
    this.lastItemCount = items.length;
    return (
      <div className="inventory">
        <div className="inventory-header">
          <div style={{textAlign:'center'}}>
            {
              (user)?<img className="inventory-header-profile-image" alt="User Avatar" src={user.profile_image_url}/>: null
            }
            <h1 className="inventory-header-display-name">{((user) ? user.display_name : '?') + '\'s Inventory'}</h1>
          </div>
          <div className="inventory-toolbar">
            <button type="button" onClick={this.onRefresh}>Refresh</button>
          </div>
        </div>
        <div className="inventory-container">
          {
            _.map(items, (item, idx) => {
              return <InventorySlot item={item} idx={Math.max(idx - lastItemCount, 0)}/>
            })
          }
          <LazyLoader ref={(ref) => this.lazyLoader = ref} className="inventory-loader"
                      onLoaded={this.onLoaded} getPageData={this.getPageData}/>
        </div>
      </div>
    );
  }
}