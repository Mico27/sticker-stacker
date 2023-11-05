import React from "react";
import PropTypes from "prop-types";
import { MemoryRouter, Route, Routes, Navigate } from "react-router-dom";
import ViewerMain from "./ViewerMain.jsx";
import Inventory from "./Inventory.jsx";
import Users from "./Users.jsx";
import Trade from "./Trade.jsx";
import PendingTrades from "./PendingTrades.jsx";
import ScoreDetails from "./ScoreDetails.jsx";
import ApiHandler from "../classes/ApiHandler";
import {SyncLoader} from "react-spinners";

export default class ViewerApp extends React.Component {

  static childContextTypes = {
    apiHandler: PropTypes.object, // Api handler
  };

  constructor(props, context) {
    super(props, context);
    this.twitch = window.Twitch ? window.Twitch.ext : null;
    this.apiHandler = new ApiHandler();
    this.state = {
      loading: true,
    };
  }

  getChildContext() {
    return {
      apiHandler: this.apiHandler,
    };
  }

  componentDidMount() {
    if (this.twitch) {
      this.twitch.onAuthorized((auth) => {
        this.apiHandler.auth = auth;
        this.setState({
          loading: false,
        });
      });
      this.twitch.listen('broadcast', (target, contentType, message)=>{
        if (message){
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
  }

  render() {
    if (this.state.loading){
      return <SyncLoader color="#36d7b7"/>
    }
    return (
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<ViewerMain/>}>
            <Route index element={<Navigate to="/inventory" replace/>}/>
            <Route path="inventory" element={<Inventory/>}/>
            <Route path="users" element={<Users/>}/>
            <Route path="trade" element={<Trade/>}/>
            <Route path="pending-trades" element={<PendingTrades/>}/>
            <Route path="score-details" element={<ScoreDetails/>}/>
          </Route>
        </Routes>
      </MemoryRouter>
    );
  }
}