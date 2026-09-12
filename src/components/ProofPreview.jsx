import { pactEvidenceFiles, proofKind } from "../lib/proofMedia.js";
import { SignalCard } from "./ProofSignals.jsx";

function isVideo(file) {
  return String(file.mime || "").startsWith("video/") || /\.(mp4|webm|mov)$/i.test(file.name || "");
}

export default function ProofPreview({ pact, localFiles = [] }) {
  if (pact?.evidenceSignal) {
    return (
      <>
        <SignalCard signal={pact.evidenceSignal} />
        {pact.evidenceName ? <span className="proof-name">{pact.evidenceName}</span> : null}
      </>
    );
  }
  const files = pactEvidenceFiles(pact, localFiles);
  if (!files.length) {
    return <p className="hint">No frame yet. Challenger drops a photo, a burst, or a short clip for Gemini Flash.</p>;
  }
  const kind = pact?.evidenceKind || proofKind(files);
  if (kind === "video" || isVideo(files[0])) {
    return (
      <div className="proof-frame">
        <video className="preview" src={files[0].dataUrl} controls playsInline>
          Clip preview
        </video>
        {pact?.evidenceName ? <span className="proof-name">{pact.evidenceName}</span> : null}
      </div>
    );
  }
  if (files.length > 1) {
    return (
      <div className="proof-frame">
        <div className="proof-burst">
          {files.map((file, i) => (
            <img key={`${file.name}-${i}`} className="preview" src={file.dataUrl} alt={file.name || `Frame ${i + 1}`} />
          ))}
        </div>
        <span className="proof-name">{pact?.evidenceName || `${files.length}-frame burst`}</span>
      </div>
    );
  }
  return (
    <div className="proof-frame">
      <img className="preview" src={files[0].dataUrl} alt={files[0].name || "Evidence"} />
      {pact?.evidenceName ? <span className="proof-name">{pact.evidenceName}</span> : null}
    </div>
  );
}
