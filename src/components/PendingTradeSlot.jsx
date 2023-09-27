import React from "react";
import PropTypes from "prop-types";

export default class PendingTradeSlot extends React.Component {

  static propTypes = {
    pendingTrade: PropTypes.object,
    onTrade: PropTypes.func,
  };

  constructor(props, context) {
    super(props);
    this.onTrade = this.onTrade.bind(this);
  }

  onTrade(){
    if (this.props.onTrade){
      this.props.onTrade(this.props.pendingTrade.toUserId);
    }
  }

  render() {
    const {pendingTrade} = this.props;
    if (!pendingTrade){
      return null;
    }
    return (
      <div className="user-slot">
        <div className="user-slot-thumbnail"><div style={{backgroundColor:'blue'}}/></div>
        <div className="user-slot-name">{pendingTrade.toUserName}</div>
        <div className="user-slot-buttons">
          <button type="button" onClick={this.onTrade}>Trade</button>
        </div>
      </div>
    );
  }
}