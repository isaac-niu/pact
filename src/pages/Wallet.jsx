import { useCallback, useEffect, useState } from "react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { SOLANA_CLUSTER } from "../solana/config.js";
import { formatSol, truncatePubkey } from "../lib/solanaFormat.js";
import WalletContextProvider from "../solana/WalletContextProvider.jsx";

function WalletPageContent() {
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();
  const [balanceLamports, setBalanceLamports] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const refreshBalance = useCallback(async () => {
    if (!publicKey) return;
    setLoading(true);
    try {
      const lamports = await connection.getBalance(publicKey);
      setBalanceLamports(lamports);
    } catch (err) {
      setMessage(err.message || "Could not fetch balance.");
    } finally {
      setLoading(false);
    }
  }, [connection, publicKey]);

  useEffect(() => {
    if (!connected) {
      setBalanceLamports(null);
      return;
    }
    refreshBalance();
  }, [connected, refreshBalance]);

  async function onAirdrop() {
    if (!publicKey) return;
    setMessage("");
    setLoading(true);
    try {
      const signature = await connection.requestAirdrop(publicKey, LAMPORTS_PER_SOL);
      await connection.confirmTransaction(signature, "confirmed");
      setMessage("Airdropped 1 SOL (devnet).");
      await refreshBalance();
    } catch (err) {
      setMessage(err.message || "Airdrop failed — devnet faucet is often rate-limited, try again shortly.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="kicker">Real wallet · {SOLANA_CLUSTER}</div>
          <h2>Wallet</h2>
          <p className="lede slim">
            A real Solana wallet on {SOLANA_CLUSTER}, separate from the desk&apos;s virtual SOL
            bank. Nothing here spends on your behalf or touches a pact&apos;s stake.
          </p>
        </div>
      </div>

      <div className="card">
        <div className="kicker">Connect</div>
        <p className="hint">
          Connect any Wallet Standard wallet (Phantom, Solflare, Backpack, ...). No install
          required beyond the extension itself.
        </p>
        <WalletMultiButton />
      </div>

      {connected && publicKey ? (
        <div className="odds-strip profile-strip">
          <div className="odds-cell">
            <div className="odds-label">Address</div>
            <div className="odds-value" title={publicKey.toBase58()}>
              {truncatePubkey(publicKey.toBase58())}
            </div>
          </div>
          <div className="odds-cell">
            <div className="odds-label">Balance ({SOLANA_CLUSTER})</div>
            <div className="odds-value lime">
              {balanceLamports === null ? "—" : `${formatSol(balanceLamports)} SOL`}
            </div>
          </div>
          <div className="odds-cell">
            <div className="odds-label">Actions</div>
            <div className="odds-value">
              <button className="btn btn-ghost" type="button" onClick={refreshBalance} disabled={loading}>
                Refresh
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {connected ? (
        <div className="card">
          <div className="kicker">Devnet faucet</div>
          <p className="hint">
            Request 1 devnet SOL to try the wallet out. Devnet SOL has no real value and the
            faucet is rate-limited — it may fail under load.
          </p>
          <button className="btn btn-lime" type="button" onClick={onAirdrop} disabled={loading}>
            Request 1 SOL airdrop
          </button>
        </div>
      ) : null}

      {message ? <p className="hint">{message}</p> : null}
    </div>
  );
}

export default function Wallet() {
  return (
    <WalletContextProvider>
      <WalletPageContent />
    </WalletContextProvider>
  );
}
