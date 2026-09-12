import { describeRail, normalizeEscrow } from "../lib/solanaEscrow.js";
import { shortPubkey } from "../lib/solanaWallet.js";
import { useWallet } from "../wallet/WalletProvider.jsx";

export function WalletRail({ compact = false }) {
  const {
    connected,
    connecting,
    error,
    cluster,
    publicKey,
    wallet,
    injected,
    connectDemo,
    connectInjected,
    disconnect,
  } = useWallet();

  if (compact) {
    if (connected) {
      return (
        <span className="wallet-chip" title={`${wallet.name} · ${cluster}`}>
          <span className="bank-who">{wallet.kind === "demo" ? "Demo desk" : wallet.name}</span>
          <b>{shortPubkey(publicKey)}</b>
        </span>
      );
    }
    return (
      <span className="wallet-chip muted" title="Virtual book until a wallet sits">
        Rail off
      </span>
    );
  }

  return (
    <div className="card wallet-rail" id="wallet-rail">
      <div className="kicker">Wallet rail</div>
      <p className="hint">
        Sit a Solana desk to lock stakes on-chain. The virtual book still holds the ticket if the
        chain miss. Default cluster is {cluster}.
      </p>
      {connected ? (
        <div className="wallet-connected">
          <div className="odds-strip profile-strip">
            <div className="odds-cell">
              <div className="odds-label">Desk</div>
              <div className="odds-value">{wallet.kind === "demo" ? "DEMO" : wallet.name.toUpperCase()}</div>
            </div>
            <div className="odds-cell">
              <div className="odds-label">Pubkey</div>
              <div className="odds-value small">{shortPubkey(publicKey)}</div>
            </div>
            <div className="odds-cell">
              <div className="odds-label">Cluster</div>
              <div className="odds-value small">{cluster}</div>
            </div>
          </div>
          {wallet.kind === "demo" ? (
            <p className="hint">
              Demo desk signs locally and does not broadcast. Connect Phantom to post a real memo
              on {cluster}.
            </p>
          ) : (
            <p className="hint lime-hint">Injected wallet live — memo locks go to {cluster}.</p>
          )}
          <button className="btn btn-ghost" type="button" onClick={disconnect} disabled={connecting}>
            Stand down
          </button>
        </div>
      ) : (
        <div className="wallet-actions">
          <button
            className="btn btn-lime"
            type="button"
            onClick={connectInjected}
            disabled={connecting}
          >
            {injected.adapter ? `Connect ${injected.name}` : "Connect Phantom"}
          </button>
          <button className="btn btn-ghost" type="button" onClick={connectDemo} disabled={connecting}>
            Sit the demo desk
          </button>
        </div>
      )}
      {error ? <p className="err">{error}</p> : null}
    </div>
  );
}

export function EscrowRail({ escrow }) {
  const row = normalizeEscrow(escrow);
  return (
    <div className="card escrow-rail">
      <div className="kicker">Stake rail</div>
      <p className="lede slim">{describeRail(row)}</p>
      <dl className="spec">
        <div>
          <dt>Book</dt>
          <dd>{row.rail === "solana" ? "Chain" : "Virtual"}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd>{row.status.toUpperCase()}</dd>
        </div>
        {row.lockSig ? (
          <div>
            <dt>Lock</dt>
            <dd className="mono-sig">{shortPubkey(row.lockSig)}</dd>
          </div>
        ) : null}
        {row.matchSig ? (
          <div>
            <dt>Match</dt>
            <dd className="mono-sig">{shortPubkey(row.matchSig)}</dd>
          </div>
        ) : null}
      </dl>
    </div>
  );
}
