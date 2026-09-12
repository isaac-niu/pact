import { useState } from "react";
import { usePact, userById } from "../store.jsx";
import {
  TAPE_EMOJIS,
  commentsForEvent,
  reactionCounts,
  userReactionOnEvent,
} from "../lib/tapeTalk.js";

const EMOJI_LABEL = {
  "🔥": "Heat",
  "😬": "Sweat",
};

export default function TapeTalk({ eventId, compact = false }) {
  const { reactions, comments, userId, reactToMark, commentOnMark } = usePact();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const counts = reactionCounts(reactions, eventId);
  const mine = userReactionOnEvent(reactions, eventId, userId);
  const takes = commentsForEvent(comments, eventId);

  async function onReact(emoji) {
    setError("");
    setBusy(true);
    try {
      await reactToMark(eventId, emoji);
    } catch (err) {
      setError(err.message || "Could not mark the tape");
    } finally {
      setBusy(false);
    }
  }

  async function onComment(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await commentOnMark(eventId, draft);
      setDraft("");
    } catch (err) {
      setError(err.message || "Could not post the take");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className={`tape-talk ${compact ? "is-compact" : ""}`}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="tape-reacts" role="group" aria-label="Mark this take">
        {TAPE_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            className={`react-btn ${mine?.emoji === emoji ? "on" : ""}`}
            disabled={busy}
            aria-pressed={mine?.emoji === emoji}
            aria-label={`${EMOJI_LABEL[emoji]} ${counts[emoji] || 0}`}
            onClick={() => onReact(emoji)}
          >
            <span aria-hidden="true">{emoji}</span>
            <b>{counts[emoji] || 0}</b>
          </button>
        ))}
      </div>
      {takes.length ? (
        <ol className="take-list">
          {takes.map((row) => (
            <li key={row.id}>
              <b>{userById(row.userId)?.handle || "DESK"}</b>
              <span>{row.body}</span>
            </li>
          ))}
        </ol>
      ) : null}
      <form className="take-form" onSubmit={onComment}>
        <label className="sr-only" htmlFor={`take-${eventId}`}>
          Short take
        </label>
        <input
          id={`take-${eventId}`}
          value={draft}
          maxLength={140}
          placeholder="Short take on this mark"
          disabled={busy}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button className="btn btn-ghost" type="submit" disabled={busy || !draft.trim()}>
          Post take
        </button>
      </form>
      {error ? <p className="err">{error}</p> : null}
    </div>
  );
}
