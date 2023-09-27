import React from "react";
import PropTypes from "prop-types";
import * as _ from "underscore";
import LazyLoader from "./LazyLoader.jsx";
import TradeInventorySectionSlot from "./TradeInventorySectionSlot.jsx";

const INVENTORY_PAGE_SIZE = 16;

export default class TradeInventorySection extends React.Component {

  static contextTypes = {
    apiHandler: PropTypes.object.isRequired,
    currentUser: PropTypes.object.isRequired,
  };

  static propTypes = {
    userId: PropTypes.number,
    onAddItem: PropTypes.func,
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
    this.context.apiHandler.getUser(this.props.userId || this.context.currentUser.id).then((user) => {
      this.setState({
        user: user,
      });
    })
  }

  getPageData(currentPage) {
    return this.context.apiHandler.getInventoryItems(this.props.userId || this.context.currentUser.id,
      currentPage * INVENTORY_PAGE_SIZE, INVENTORY_PAGE_SIZE)
  }

  onLoaded(data) {
    this.setState({
      items: data,
    });
  }

  onInventoryChanged(userId) {
    if (this.lazyLoader && (this.props.userId || this.context.currentUser.id) === userId) {
      this.lazyLoader.reset();
    }
  }

  render() {
    const {onAddItem} = this.props;
    const {items, user} = this.state;
    const lastItemCount = this.lastItemCount || 0;
    this.lastItemCount = items.length;
    return (
      <div className="inventory">
        <div className="inventory-header">
          <h1>{((user) ? user.name : '?') + '\'s Inventory'}</h1>
          <div className="inventory-toolbar">
            <button type="button">Filter</button>
            <button type="button">Sort</button>
          </div>
        </div>
        <div className="inventory-container">
          {
            _.map(items, (item, idx) => {
              return <TradeInventorySectionSlot item={item} idx={Math.max(idx - lastItemCount, 0)} onClick={onAddItem}/>
            })
          }
          <LazyLoader ref={(ref) => this.lazyLoader = ref} className="inventory-loader"
                      onLoaded={this.onLoaded} getPageData={this.getPageData}/>
        </div>
      </div>
    );
  }
}