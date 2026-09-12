export const PROCESSORS = [
  { id: "card", name: "Card", rail: "Visa · Mastercard · Amex", tone: "card" },
  { id: "apple", name: "Apple Pay", rail: "Face ID · Touch ID", tone: "apple" },
  { id: "paypal", name: "PayPal", rail: "Balance or bank", tone: "paypal" },
  { id: "coinbase", name: "Coinbase", rail: "On-ramp to virtual SOL", tone: "coinbase" },
  { id: "cashapp", name: "Cash App", rail: "Cashtag rail", tone: "cash" },
  { id: "venmo", name: "Venmo", rail: "Friends list", tone: "venmo" },
];

export const SOL_USD = 142.18;
export const MIN_SOL = 1;
export const MAX_SOL = 500;

export function processorById(id) {
  return PROCESSORS.find((row) => row.id === id) || PROCESSORS[0];
}

export function parseDeposit({ amount, processor } = {}) {
  const sol = Number(amount);
  const rail = processorById(processor);
  if (!Number.isFinite(sol) || sol < MIN_SOL || sol > MAX_SOL) {
    throw new Error(`Stake between ${MIN_SOL} and ${MAX_SOL} SOL`);
  }
  return {
    amount: Math.round(sol * 100) / 100,
    processor: rail.id,
    processorName: rail.name,
    usd: Math.round(sol * SOL_USD * 100) / 100,
  };
}

export function receiptCode() {
  return `PACT-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}
