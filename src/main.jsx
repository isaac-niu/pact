import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { PactProvider } from "./store.jsx";
import { boot } from "./api/pact.js";
import "./index.css";

boot().finally(() => {
  createRoot(document.getElementById("root")).render(
    <StrictMode>
      <BrowserRouter>
        <PactProvider>
          <App />
        </PactProvider>
      </BrowserRouter>
    </StrictMode>,
  );
});
