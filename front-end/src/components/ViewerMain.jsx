import React from "react";
import { Outlet, NavLink } from "react-router-dom";
import PropTypes from "prop-types";
import {CSSTransition} from "react-transition-group";

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
      open: false,
    }
    this.onInventoryChanged = this.onInventoryChanged.bind(this);
    this.onToggleMenu = this.onToggleMenu.bind(this);
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

  loadCurrentUser() {
    this.context.apiHandler.getCurrentUser().then((user) => {
      this.setState({
        user: user,
      })
    });
  }

  onInventoryChanged(userId) {
    if (this.state.user && this.state.user.id === userId) {
      this.loadCurrentUser();
    }
  }

  onToggleMenu() {
    this.setState({
      open: !this.state.open,
    });
  }

  render() {
    const {user, open, mainMenuContainer} = this.state;
    return (
      <div className="main-menu">
        <CSSTransition
          in={open}
          timeout={300}
          classNames="main-menu-transition"
          unmountOnExit
        >
          <div className="main-menu-container">
            <div className="main-menu-header">
              <NavLink style={{flex: 1}} to="/inventory">Inventory</NavLink>
              <NavLink style={{flex: 1}} to="/score-details">Score Details</NavLink>
              <h1 style={{flex: 'auto'}}>{'Score: ' + ((user) ? user.score : '')}</h1>
              <NavLink style={{flex: 1}} to="/users">Users</NavLink>
              <NavLink style={{flex: 1}} to="/pending-trades">Trades</NavLink>
            </div>
            {
              (user) ? <Outlet/> : null
            }
          </div>
        </CSSTransition>
        <img className="main-menu-toggle"
             onClick={this.onToggleMenu}
             src={(open) ?
               (process.env.PUBLIC_URL + '/img/items/funt.png') :
               (process.env.PUBLIC_URL + '/img/items/funt_shiny.png')}
        />
      </div>
    );
  }
}