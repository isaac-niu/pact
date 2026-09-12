export function sol(n) {
  const value = Number(n);
  if (!Number.isFinite(value)) return "0.00";
  return value.toFixed(2);
}

export function solLabel(n) {
  return `${sol(n)} SOL`;
}

export function localInputValue(ts) {
  const d = new Date(ts);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function defaultDeadline(from = Date.now()) {
  const d = new Date(from + 24 * 60 * 60 * 1000);
  d.setMinutes(0, 0, 0);
  return d.getTime();
}

export function formatWhen(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatClock(ts) {
  if (!ts) return "--:--";
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function deadlineTone(ts) {
  if (!ts) return "muted";
  const left = ts - Date.now();
  if (left < 0) return "late";
  if (left < 6 * 60 * 60 * 1000) return "hot";
  return "ok";
}
