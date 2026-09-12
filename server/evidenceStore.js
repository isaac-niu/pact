import { evidenceBucket, getMongo, mongoConfigured, ObjectId } from "./mongo.js";

function parseDataUrl(dataUrl) {
  const m = String(dataUrl || "").match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return null;
  return { mime: m[1], buffer: Buffer.from(m[2], "base64") };
}

/**
 * Store proof in GridFS. Returns a URL Person B can hang on evidenceUrl.
 * Falls back to the in-browser data URL when Atlas is down.
 */
export async function storeEvidence({ pactId, fileName, dataUrl, mimeType }) {
  if (!mongoConfigured()) {
    return { evidenceUrl: dataUrl, evidenceGridFsId: null, stored: false };
  }
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) {
    return { evidenceUrl: dataUrl, evidenceGridFsId: null, stored: false };
  }

  const { db } = await getMongo();
  const bucket = evidenceBucket(db);
  const filename = fileName || "proof.jpg";
  const id = await new Promise((resolve, reject) => {
    const stream = bucket.openUploadStream(filename, {
      contentType: mimeType || parsed.mime || "image/jpeg",
      metadata: { pactId: pactId || null, uploadedAt: Date.now() },
    });
    stream.on("error", reject);
    stream.on("finish", () => resolve(stream.id));
    stream.end(parsed.buffer);
  });

  return {
    evidenceUrl: `/api/evidence/${id.toString()}`,
    evidenceGridFsId: id.toString(),
    stored: true,
  };
}

export async function readEvidence(id) {
  const { db } = await getMongo();
  const _id = new ObjectId(String(id));
  const doc = await db.collection("evidence.files").findOne({ _id });
  if (!doc) return null;
  const bucket = evidenceBucket(db);
  const chunks = [];
  await new Promise((resolve, reject) => {
    const stream = bucket.openDownloadStream(_id);
    stream.on("data", (c) => chunks.push(c));
    stream.on("error", reject);
    stream.on("end", resolve);
  });
  return {
    buffer: Buffer.concat(chunks),
    contentType: doc.contentType || "application/octet-stream",
    filename: doc.filename || "proof.jpg",
  };
}

/**
 * Write evidence + verdict onto B's `pacts` collection keyed by clientId
 * (Person A's pkt_ ids). B's ObjectId documents are left alone.
 */
export async function persistPactProof({
  pactId,
  title,
  criteria,
  creatorId,
  opponentId,
  stake,
  status,
  evidenceUrl,
  evidenceName,
  evidenceGridFsId,
  evidenceHash,
  verdict,
  winnerId,
}) {
  if (!mongoConfigured() || !pactId) return { stored: false };
  const { db } = await getMongo();
  const now = new Date();
  const set = {
    clientId: pactId,
    title: title || "",
    criteria: criteria || "",
    creatorId: creatorId || null,
    opponentId: opponentId || null,
    stake: Number(stake) || 0,
    status,
    evidenceUrl: evidenceUrl || null,
    evidenceName: evidenceName || null,
    evidenceGridFsId: evidenceGridFsId || null,
    evidenceHash: evidenceHash || verdict?.evidenceHash || null,
    verdict: verdict || null,
    winnerId: winnerId || null,
    updatedAt: now,
  };
  if (status === "resolved") set.resolvedAt = now;
  await db.collection("pacts").updateOne(
    { clientId: pactId },
    {
      $set: set,
      $setOnInsert: { createdAt: now, source: "gemini-lane" },
    },
    { upsert: true },
  );
  return { stored: true };
}
