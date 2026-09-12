import { useEffect, useRef, useState } from "react";
import { fetchAnnouncementAudio, isMuted, setMuted as persistMuted } from "../announcer.js";

export default function Announcer({ pact, winnerHandle }) {
  const [audioUrl, setAudioUrl] = useState(null);
  const [muted, setMuted] = useState(isMuted);
  const [status, setStatus] = useState("idle");
  const audioRef = useRef(null);
  const requested = useRef(null);

  useEffect(() => {
    if (!pact?.verdict || requested.current === pact.id) return;
    requested.current = pact.id;
    let cancelled = false;
    setStatus("loading");
    fetchAnnouncementAudio(pact, winnerHandle).then((url) => {
      if (cancelled) return;
      setAudioUrl(url);
      setStatus(url ? "ready" : "off");
    });
    return () => {
      cancelled = true;
    };
  }, [pact, winnerHandle]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !audioUrl || muted) return;
    el.currentTime = 0;
    const play = el.play();
    if (play?.catch) play.catch(() => {});
  }, [audioUrl, muted]);

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    persistMuted(next);
    const el = audioRef.current;
    if (next && el) el.pause();
    else if (!next && el && audioUrl) el.play().catch(() => {});
  }

  function replay() {
    const el = audioRef.current;
    if (!el || !audioUrl) return;
    el.currentTime = 0;
    el.play().catch(() => {});
  }

  if (!pact?.verdict) return null;

  return (
    <div className="announcer">
      {audioUrl ? <audio ref={audioRef} src={audioUrl} preload="auto" /> : null}
      <div className="announcer-row">
        <button type="button" className="btn btn-ghost" onClick={toggleMute}>
          {muted ? "Unmute desk" : "Mute desk"}
        </button>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={replay}
          disabled={!audioUrl || muted}
        >
          Replay call
        </button>
      </div>
      <p className="hint">
        {status === "off" || (!audioUrl && status !== "loading")
          ? "Announcer is optional. Add ELEVENLABS_API_KEY on the server to hear the settle call."
          : muted
            ? "Desk is muted."
            : "Sportsbook call plays once when the slip settles. Voice by ElevenLabs."}
      </p>
    </div>
  );
}
