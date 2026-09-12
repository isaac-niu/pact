import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { env } from "../env.js";
import { clusterFromEnv, rpcFromEnv } from "../lib/solanaEscrow.js";
import {
  clearDemoSecret,
  connectDemoWallet,
  connectInjectedWallet,
  detectInjectedWallet,
  disconnectWallet,
} from "../lib/solanaWallet.js";

const disconnected = {
  wallet: null,
  connected: false,
  connecting: false,
  error: "",
  cluster: "devnet",
  rpc: "https://api.devnet.solana.com",
  injected: { name: null, readyState: "NotDetected", adapter: null },
  publicKey: null,
  connectDemo: async () => {},
  connectInjected: async () => {},
  disconnect: async () => {},
  sendEscrow: async () => {
    throw new Error("No wallet on this desk");
  },
};

const WalletContext = createContext(disconnected);

export function WalletProvider({ children }) {
  const [wallet, setWallet] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");
  const [injected, setInjected] = useState(() => detectInjectedWallet());
  const cluster = clusterFromEnv({ cluster: env.SOLANA_CLUSTER });
  const rpc = rpcFromEnv({ cluster, rpc: env.SOLANA_RPC });

  const connectDemo = useCallback(async () => {
    setError("");
    setConnecting(true);
    try {
      const next = await connectDemoWallet();
      setWallet(next);
    } catch (err) {
      setError(err.message || "Could not sit the demo desk");
    } finally {
      setConnecting(false);
    }
  }, []);

  const connectInjected = useCallback(async () => {
    setError("");
    setConnecting(true);
    try {
      const found = detectInjectedWallet();
      setInjected(found);
      if (!found.adapter) throw new Error("No Phantom on this browser — sit the demo desk");
      const next = await connectInjectedWallet(found.adapter);
      setWallet(next);
    } catch (err) {
      setError(err.message || "Could not connect");
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    await disconnectWallet(wallet);
    if (wallet?.kind === "demo") clearDemoSecret();
    setWallet(null);
    setError("");
  }, [wallet]);

  const sendEscrow = useCallback(
    async (args) => {
      const { sendEscrowMemo } = await import("../lib/solanaChain.js");
      return sendEscrowMemo({
        ...args,
        wallet,
        env: {
          SOLANA_CLUSTER: env.SOLANA_CLUSTER,
          SOLANA_RPC: env.SOLANA_RPC,
          SOLANA_ALLOW_MAINNET: env.SOLANA_ALLOW_MAINNET,
        },
      });
    },
    [wallet],
  );

  const api = useMemo(
    () => ({
      wallet,
      connected: Boolean(wallet?.publicKey),
      connecting,
      error,
      cluster,
      rpc,
      injected,
      publicKey: wallet?.publicKey || null,
      connectDemo,
      connectInjected,
      disconnect,
      sendEscrow,
    }),
    [
      wallet,
      connecting,
      error,
      cluster,
      rpc,
      injected,
      connectDemo,
      connectInjected,
      disconnect,
      sendEscrow,
    ],
  );

  return <WalletContext.Provider value={api}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  return useContext(WalletContext) || disconnected;
}
