import React from "react";
import { Outlet, NavLink } from "react-router-dom";
import PropTypes from "prop-types";

export default class ViewerMain extends React.Component {

  static childContextTypes = {
    currentUser: PropTypes.object, // Current user
  };

  static contextTypes = {
    apiHandler: PropTypes.object.isRequired,
  };

  constructor(props, context) {
    super(props, context);
    this.state = {
      user: null,
    }
    this.onInventoryChanged = this.onInventoryChanged.bind(this);
  }

  componentDidMount() {
    this.context.apiHandler.onInventoryChangedEvent.addListener(this.onInventoryChanged);
    this.loadCurrentUser();
  }

  componentWillUnmount() {
    this.context.apiHandler.onInventoryChangedEvent.removeListener(this.onInventoryChanged);
  }

  getChildContext() {
    return {
      currentUser: this.state.user,
    };
  }

  loadCurrentUser(){
    this.context.apiHandler.getCurrentUser().then((user) => {
      this.setState({
        user: user,
      })
    });
  }

  onInventoryChanged(userId){
    if (this.state.user && this.state.user.id === userId) {
      this.loadCurrentUser();
    }
  }

  render() {
    const {user} = this.state;
    return (
      <div className="main-menu-container">
        <div className="main-menu-header">
          <NavLink style={{flex:1}} to="/inventory">Inventory</NavLink>
          <NavLink style={{flex:1}} to="/score-details">Score Details</NavLink>
          <h1 style={{flex:'auto'}}>{'Score: ' + ((user)? user.score: '')}</h1>
          <NavLink style={{flex:1}} to="/users">Users</NavLink>
          <NavLink style={{flex:1}} to="/pending-trades">Trades</NavLink>
        </div>
        {
          (user)? <Outlet />: null
        }
      </div>
    );
  }
}