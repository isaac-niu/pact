import { usePact } from "../store.jsx";
import { useLiveAccount } from "../auth/useLiveAccount.js";
import { api } from "../api.js";
import AddSol from "../components/AddSol.jsx";
import { sol } from "../lib/format.js";

const LAMPORTS = 1_000_000_000;

export default function Wallet() {
  const desk = usePact();
  const live = useLiveAccount();
  const authBank = live.me ? live.me.balanceLamports / LAMPORTS : null;

  return (
    <div>
      <div className="page-head">
        <div>
          <div className="kicker">Cashier</div>
          <h2>Add SOL</h2>
          <p className="lede slim">
            {live.live
              ? `${live.me?.name || "Your account"} · ${authBank == null ? "…" : sol(authBank)} SOL on the signed-in ledger`
              : `${desk.user.handle} · ${sol(desk.bank)} SOL on the sportsbook desk`}
          </p>
        </div>
      </div>
      <AddSol
        bankLabel={live.live ? "Auth0 ledger" : "Desk bank"}
        onConfirm={async (payload) => {
          if (live.live) {
            const token = await live.tokenOf();
            const out = await api("/api/ledger/deposit", { token, method: "POST", body: payload });
            await live.refresh();
            return out;
          }
          return desk.depositFunds(payload);
        }}
      />
    </div>
  );
}
