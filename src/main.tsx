import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./notoFonts.css";
import "./fonts.css";
import "./displayFonts.css";
import "./style.css";
import "./workbench.css";
import "./neo-manga.css";
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
