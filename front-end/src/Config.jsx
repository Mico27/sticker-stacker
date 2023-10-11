import React from "react";
import { createRoot } from "react-dom/client";
import ConfigApp from './components/ConfigApp.jsx';
import "./style.css";

const rootElement = document.getElementById("root");
const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ConfigApp/>
  </React.StrictMode>
);