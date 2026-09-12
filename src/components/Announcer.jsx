import { useEffect, useRef, useState } from "react";
import {
  announcerEnabled,
  fetchAnnouncementAudio,
  fetchDeskConfig,
  isMuted,
  setMuted as persistMuted,
} from "../announcer.js";

export default function Announcer({ pact, winnerHandle }) {
  const [audioUrl, setAudioUrl] = useState(null);
  const [muted, setMuted] = useState(isMuted);
  const [status, setStatus] = useState("idle");
  const [liveVoice, setLiveVoice] = useState(null);
  const audioRef = useRef(null);
  const requested = useRef(null);

  useEffect(() => {
    let cancelled = false;
    fetchDeskConfig().then((cfg) => {
      if (!cancelled) setLiveVoice(announcerEnabled(cfg));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (liveVoice !== true) {
      if (liveVoice === false) setStatus("off");
      return undefined;
    }
    if (!pact?.verdict || requested.current === pact.id) return undefined;
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
  }, [pact, winnerHandle, liveVoice]);

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
          ? liveVoice === true
            ? "ElevenLabs is on the desk; this slip did not return a call."
            : "Announcer is optional. Add ELEVENLABS_API_KEY on the server to hear the settle call."
          : muted
            ? "Desk is muted."
            : "Sportsbook call plays once when the slip settles. Voice by ElevenLabs."}
      </p>
    </div>
  );
}
