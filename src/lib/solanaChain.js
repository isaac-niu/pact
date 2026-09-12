/**
 * @solana/web3.js send path for the escrow rail.
 *
 * Builds a memo transaction (wallet-adapter style: feePayer +
 * recentBlockhash + signTransaction / sendRawTransaction). Demo
 * desks sign locally and do not broadcast. Injected wallets try
 * the public cluster; a miss falls back to the virtual book.
 */

import { Connection, PublicKey, Transaction, TransactionInstruction } from "@solana/web3.js";
import { Buffer } from "buffer";
import {
  MEMO_PROGRAM_ID,
  assertSafeCluster,
  clusterFromEnv,
  demoSignature,
  memoPayload,
  rpcFromEnv,
} from "./solanaEscrow.js";
import { sendWithWallet } from "./solanaWallet.js";

export function createConnection(env = {}) {
  const cluster = assertSafeCluster(clusterFromEnv(env), env);
  return new Connection(rpcFromEnv({ ...env, cluster }), "confirmed");
}

export function buildMemoInstruction({ method, intent, fromPubkey }) {
  return new TransactionInstruction({
    keys: [{ pubkey: new PublicKey(fromPubkey), isSigner: true, isWritable: false }],
    programId: new PublicKey(MEMO_PROGRAM_ID),
    data: Buffer.from(memoPayload(method, intent), "utf8"),
  });
}

export async function buildMemoTransaction({ method, intent, fromPubkey, connection }) {
  const tx = new Transaction().add(buildMemoInstruction({ method, intent, fromPubkey }));
  tx.feePayer = new PublicKey(fromPubkey);
  if (connection?.getLatestBlockhash) {
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    tx.recentBlockhash = blockhash;
    tx.lastValidBlockHeight = lastValidBlockHeight;
  }
  return tx;
}

export async function sendEscrowMemo({ wallet, method, intent, env = {}, connection } = {}) {
  if (!wallet?.publicKey) throw new Error("No wallet on this desk");
  if (wallet.kind === "demo") {
    return { signature: demoSignature(method, intent, wallet.publicKey), demo: true };
  }
  const conn = connection || createConnection(env);
  const tx = await buildMemoTransaction({
    method,
    intent,
    fromPubkey: wallet.publicKey,
    connection: conn,
  });
  const signature = await sendWithWallet(wallet, tx, conn);
  if (!signature) throw new Error("Wallet returned no signature");
  return { signature, demo: false };
}
