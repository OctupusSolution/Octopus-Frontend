import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./app";
import { I18nProvider } from "./app/providers/i18n-provider";
import { applyStoredTheme } from "./app/providers/theme-provider";
import "./index.css";

// Apply the persisted/system theme before first paint so there is no light
// flash when the user prefers dark mode.
applyStoredTheme();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <I18nProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </I18nProvider>
  </React.StrictMode>
);
