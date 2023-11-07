import React from "react";
import PropTypes from "prop-types";

export default class UserSlot extends React.Component {

  static propTypes = {
    user: PropTypes.object,
    onListInventory: PropTypes.func,
    onScoreDetails: PropTypes.func,
    onTrade: PropTypes.func,
  };

  constructor(props, context) {
    super(props);
    this.onListInventory = this.onListInventory.bind(this);
    this.onScoreDetails = this.onScoreDetails.bind(this);
    this.onTrade = this.onTrade.bind(this);
  }

  onListInventory(){
    if (this.props.onListInventory){
      this.props.onListInventory(this.props.user.id);
    }
  }

  onScoreDetails(){
    if (this.props.onScoreDetails){
      this.props.onScoreDetails(this.props.user.id);
    }
  }

  onTrade(){
    if (this.props.onTrade){
      this.props.onTrade(this.props.user.id);
    }
  }

  render() {
    const {user} = this.props;
    if (!user){
      return null;
    }
    return (
      <div className="user-slot">
        <div className="user-slot-thumbnail"><img style={{width:'32px'}} alt="User Avatar" src={user.profile_image_url}/></div>
        <div className="user-slot-name">{user.display_name}</div>
        <div className="user-slot-score">{"Score: " + user.score}</div>
        <div className="user-slot-buttons">
          <button type="button" onClick={this.onListInventory}>Inventory</button>
          <button type="button" onClick={this.onScoreDetails}>Score details</button>
          <button type="button" onClick={this.onTrade}>Trade</button>
        </div>
      </div>
    );
  }
}