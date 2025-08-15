// src/index.js
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

const root = createRoot(document.getElementById("root"));
root.render(
  // Remove StrictMode to prevent double mount in dev
  // <React.StrictMode>
    <App />
  // </React.StrictMode>
);
