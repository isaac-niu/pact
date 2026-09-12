import { Buffer } from "buffer";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import AuthGate from "./auth/AuthGate.jsx";
import { PactProvider } from "./store.jsx";
import { WalletProvider } from "./wallet/WalletProvider.jsx";
import { boot } from "./api/pact.js";
import { registerServiceWorker } from "./lib/pwa.js";
import "./index.css";

if (!globalThis.Buffer) globalThis.Buffer = Buffer;

const root = createRoot(document.getElementById("root"));
root.render(
  <StrictMode>
    <BrowserRouter>
      <AuthGate>
        <WalletProvider>
          <PactProvider>
            <App />
          </PactProvider>
        </WalletProvider>
      </AuthGate>
    </BrowserRouter>
  </StrictMode>,
);

boot().catch(() => {});
registerServiceWorker().catch(() => {});
