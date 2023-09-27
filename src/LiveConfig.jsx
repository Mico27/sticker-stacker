import React from "react";
import { createRoot } from "react-dom/client";
import ViewerApp from './components/ViewerApp.jsx';
import "./style.css";

const rootElement = document.getElementById("root");
const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ViewerApp/>
  </React.StrictMode>
);