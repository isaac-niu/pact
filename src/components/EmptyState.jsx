export function EmptyArt({ kind = "ticket" }) {
  if (kind === "people") {
    return (
      <svg className="empty-art" viewBox="0 0 160 72" aria-hidden="true">
        <rect x="8" y="14" width="56" height="44" rx="2" fill="#12150f" stroke="#2a2f22" />
        <rect x="14" y="22" width="28" height="6" fill="#c8f542" />
        <rect x="14" y="34" width="40" height="3" fill="#2a2f22" />
        <rect x="14" y="42" width="32" height="3" fill="#2a2f22" />
        <rect x="96" y="14" width="56" height="44" rx="2" fill="#12150f" stroke="#2a2f22" />
        <rect x="102" y="22" width="28" height="6" fill="#8d907c" />
        <rect x="102" y="34" width="40" height="3" fill="#2a2f22" />
        <rect x="102" y="42" width="32" height="3" fill="#2a2f22" />
        <path d="M70 36 H90" stroke="#c8f542" strokeWidth="2" />
        <path d="M84 30 L90 36 L84 42" fill="none" stroke="#c8f542" strokeWidth="2" />
      </svg>
    );
  }
  if (kind === "crew") {
    return (
      <svg className="empty-art" viewBox="0 0 160 72" aria-hidden="true">
        <rect x="28" y="10" width="72" height="48" rx="2" fill="#10120e" stroke="#2a2f22" />
        <rect x="48" y="18" width="72" height="48" rx="2" fill="#12150f" stroke="#8aaa2a" />
        <rect x="56" y="26" width="36" height="6" fill="#c8f542" />
        <rect x="56" y="38" width="48" height="3" fill="#2a2f22" />
        <rect x="56" y="46" width="40" height="3" fill="#2a2f22" />
      </svg>
    );
  }
  return (
    <svg className="empty-art" viewBox="0 0 160 72" aria-hidden="true">
      <rect x="36" y="8" width="88" height="56" rx="2" fill="#12150f" stroke="#2a2f22" />
      <path d="M36 20 H124" stroke="#2a2f22" />
      <rect x="44" y="12" width="28" height="6" fill="#c8f542" />
      <rect x="96" y="12" width="20" height="6" fill="#2a2f22" />
      <rect x="44" y="28" width="56" height="8" fill="#f3f0e6" />
      <rect x="44" y="42" width="24" height="10" fill="#1a220c" />
      <rect x="72" y="42" width="24" height="10" fill="#1a220c" />
      <rect x="100" y="42" width="16" height="10" fill="#c8f542" />
    </svg>
  );
}

export default function EmptyState({ kicker, title, lede, action, art = "ticket" }) {
  return (
    <div className="empty empty-desk" role="status">
      <EmptyArt kind={art} />
      {kicker ? <div className="kicker">{kicker}</div> : null}
      <h3 className="empty-title">{title}</h3>
      {lede ? <p className="lede slim">{lede}</p> : null}
      {action ? <div className="cta-row empty-actions">{action}</div> : null}
    </div>
  );
}
