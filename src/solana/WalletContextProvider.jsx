import { Buffer } from "buffer";
import { useMemo } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import "@solana/wallet-adapter-react-ui/styles.css";
import { solanaRpcUrl } from "./config.js";

// @solana/web3.js expects Node's Buffer global; Vite doesn't polyfill it.
// Deferred to this module (rather than main.jsx) so the polyfill and the
// ~700KB of wallet-adapter code only load when /wallet is actually visited.
window.Buffer = window.Buffer || Buffer;

/**
 * Wraps the app with real Solana wallet context. No adapter list is passed:
 * any Wallet Standard wallet (Phantom, Solflare, Backpack, ...) registers
 * itself automatically, so we don't have to hand-pick and bundle SDKs.
 */
export default function WalletContextProvider({ children }) {
  const endpoint = useMemo(() => solanaRpcUrl(), []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={[]} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
