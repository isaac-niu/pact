import { clusterApiUrl } from "@solana/web3.js";
import { env } from "../env.js";

/**
 * Real Solana wallet support, kept deliberately separate from the app's
 * virtual-SOL game loop (desk bank, ledger, stakes). This only powers the
 * /wallet page: connect a real wallet, see its real devnet balance. Nothing
 * here touches pact creation, staking, or the ledger.
 */
export const SOLANA_CLUSTER = "devnet";

export function solanaRpcUrl() {
  return env.SOLANA_RPC_URL || clusterApiUrl(SOLANA_CLUSTER);
}
