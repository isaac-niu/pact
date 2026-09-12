const LAMPORTS_PER_SOL = 1_000_000_000;

export function lamportsToSol(lamports) {
  const value = Number(lamports);
  if (!Number.isFinite(value)) return 0;
  return value / LAMPORTS_PER_SOL;
}

export function formatSol(lamports) {
  return lamportsToSol(lamports).toFixed(4);
}

export function truncatePubkey(pubkey, chars = 4) {
  const value = String(pubkey ?? "");
  if (value.length <= chars * 2 + 3) return value;
  return `${value.slice(0, chars)}…${value.slice(-chars)}`;
}
