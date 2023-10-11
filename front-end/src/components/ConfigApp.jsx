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

export default class ConfigApp extends React.Component {

  static childContextTypes = {
    apiHandler: PropTypes.object, // Api handler
  };

  constructor(props, context) {
    super(props, context);
    this.apiHandler = new ApiHandler();
  }

  getChildContext() {
    return {
      apiHandler: this.apiHandler,
    };
  }

  render() {
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