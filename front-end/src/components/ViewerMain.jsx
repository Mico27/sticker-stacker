import React from "react";
import { Outlet, NavLink } from "react-router-dom";
import PropTypes from "prop-types";
import {CSSTransition} from "react-transition-group";
import ApiHandler from "../classes/ApiHandler";
import {SyncLoader} from "react-spinners";
import * as _ from "underscore";

export default class ViewerMain extends React.Component {

  static childContextTypes = {
    apiHandler: PropTypes.object, // Api handler
    currentUser: PropTypes.object, // Current user
  };

  constructor(props, context) {
    super(props, context);
    this.state = {
      loading: true,
      needUserId: true,
      user: null,
      open: false,
    }
    this.twitch = window.Twitch ? window.Twitch.ext : null;
    this.apiHandler = new ApiHandler();
    this.onRequestUserId = this.onRequestUserId.bind(this);
    this.onInventoryChanged = this.onInventoryChanged.bind(this);
    this.onToggleMenu = this.onToggleMenu.bind(this);
  }

  componentDidMount() {
    if (this.twitch) {
      this.twitch.onAuthorized((auth) => {
        this.apiHandler.auth = auth;
        console.log(auth);
        this.setState({
          loading: false,
          needUserId: !this.twitch.viewer.isLinked,
        });
        if (this.twitch.viewer.isLinked){
          this.loadCurrentUser();
        }
      });
      this.twitch.listen('broadcast', (target, contentType, message)=>{
        console.log(target, contentType, message);
        if (message && this.twitch.viewer.isLinked){
          const apiEvent = JSON.parse(message) || {};
          if (apiEvent.type === 'userChange' && apiEvent.userIds){
            this.apiHandler.onInventoryChanged(apiEvent.userIds);
          }
        }
      });
      //this.twitch.onContext((context,delta)=>{
      //this.contextUpdate(context,delta)
      //});
    }
    this.apiHandler.onInventoryChangedEvent.addListener(this.onInventoryChanged);
  }

  componentWillUnmount() {
    this.apiHandler.onInventoryChangedEvent.removeListener(this.onInventoryChanged);
  }

  getChildContext() {
    return {
      apiHandler: this.apiHandler,
      currentUser: this.state.user,
    };
  }

  loadCurrentUser() {
    this.apiHandler.getCurrentUser().then((user) => {
      this.setState({
        user: user,
      })
    });
  }

  onInventoryChanged(userIds) {
    if (this.state.user && _.contains(userIds, this.state.user.userId)) {
      this.loadCurrentUser();
    }
  }

  onToggleMenu() {
    this.setState({
      open: !this.state.open,
    });
  }

  onRequestUserId(){
    if (this.twitch){
      this.twitch.actions.requestIdShare();
    }
  }

  render() {
    const {user, open, loading, needUserId} = this.state;
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
              (loading)? <div className="loader-container">
                  <SyncLoader color="#36d7b7"/>
                </div>:
                (needUserId)? <div>
                    <p>You need to share your TwitchID to continue</p>
                    <button type="button" onClick={this.onRequestUserId}>Share ID</button>
                  </div>:
                  (user) ? <Outlet/> : null
            }
          </div>
        </CSSTransition>
        <img className="main-menu-toggle"
             onClick={this.onToggleMenu}
             src={(open) ?
               (process.env.PUBLIC_URL + '/img/stickerbook-open.png') :
               (process.env.PUBLIC_URL + '/img/stickerbook-closed.png')}
        />
      </div>
    );
  }
}