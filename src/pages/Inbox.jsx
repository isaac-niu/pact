import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useLiveAccount } from "../auth/useLiveAccount.js";
import { api } from "../api.js";
import { formatWhen } from "../lib/format.js";

export default function Inbox() {
  const live = useLiveAccount();
  const [params, setParams] = useSearchParams();
  const withId = params.get("with") || "";
  const [threads, setThreads] = useState([]);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");

  const other = useMemo(
    () => live.people.find((person) => person.id === withId) || threads.find((row) => row.otherId === withId)?.other,
    [live.people, threads, withId],
  );

  async function load() {
    if (!live.live) return;
    const token = await live.tokenOf();
    const list = await api("/api/messages", { token });
    setThreads(list);
    if (withId) setMessages(await api(`/api/messages?with=${encodeURIComponent(withId)}`, { token }));
  }

  useEffect(() => {
    load().catch((err) => live.setError(err.message));
  }, [live.live, withId]);

  if (!live.live) {
    return (
      <section className="card">
        <h2>Inbox</h2>
        <p className="lede">Sign in to message other accounts.</p>
      </section>
    );
  }

  async function send(e) {
    e.preventDefault();
    if (!withId || !draft.trim()) return;
    const token = await live.tokenOf();
    await api("/api/messages", { token, method: "POST", body: { toId: withId, body: draft.trim() } });
    setDraft("");
    await load();
  }

  return (
    <div className="inbox">
      <aside className="card">
        <div className="kicker">Threads</div>
        {threads.length === 0 ? <p className="hint">No messages yet.</p> : null}
        {threads.map((thread) => (
          <button
            key={thread.otherId}
            type="button"
            className={`people-row ${withId === thread.otherId ? "on" : ""}`}
            onClick={() => setParams({ with: thread.otherId })}
          >
            <span>
              <b>{thread.other?.name || "Pact user"}</b>
              <div className="hint">{thread.last?.body}</div>
            </span>
          </button>
        ))}
        <div className="kicker">People</div>
        {live.people.map((person) => (
          <button key={person.id} type="button" className="people-row" onClick={() => setParams({ with: person.id })}>
            <b>{person.name}</b>
          </button>
        ))}
      </aside>
      <section className="card">
        <h2>{other?.name || "Pick a desk"}</h2>
        <div className="thread">
          {messages.map((row) => (
            <p key={row.id} className={row.fromId === live.me?.id ? "mine" : "theirs"}>
              <span>{row.body}</span>
              <time>{formatWhen(row.createdAt)}</time>
            </p>
          ))}
        </div>
        {withId ? (
          <form className="form" onSubmit={send}>
            <label>
              Message
              <textarea value={draft} onChange={(e) => setDraft(e.target.value)} required />
            </label>
            <button className="btn btn-lime" type="submit">
              Send
            </button>
          </form>
        ) : (
          <p className="hint">Choose someone who has signed in.</p>
        )}
      </section>
    </div>
  );
}
