import { useEffect, useState } from "react";

export default function InstallDesk() {
  const [promptEvent, setPromptEvent] = useState(null);

  useEffect(() => {
    function onPrompt(event) {
      event.preventDefault();
      setPromptEvent(event);
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!promptEvent) return null;

  return (
    <button
      className="btn btn-ghost"
      type="button"
      onClick={async () => {
        await promptEvent.prompt();
        setPromptEvent(null);
      }}
    >
      Install the desk
    </button>
  );
}
