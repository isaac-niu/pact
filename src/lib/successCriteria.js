/**
 * Structured success criteria for a slip.
 *
 * Creators list what the referee has to see (face, iron, date on the notes).
 * The desk grades each line HOLD / MISS so PASS/FAIL is not one free-text
 * paragraph. `criteria` stays a joined string for older tickets and OG cards.
 */

export const MAX_CHECKLIST_ITEMS = 8;
export const MIN_CHECKLIST_ITEMS = 1;
export const MAX_ITEM_LABEL = 96;
export const MAX_ITEM_NOTE = 140;

function slug(label, index) {
  const stem = String(label || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);
  return `sc_${index}_${stem || "line"}`;
}

export function normalizeItem(raw, index = 0) {
  if (typeof raw === "string") {
    const label = raw.trim().slice(0, MAX_ITEM_LABEL);
    return label ? { id: slug(label, index), label } : null;
  }
  if (!raw || typeof raw !== "object") return null;
  const label = String(raw.label ?? raw.text ?? "").trim().slice(0, MAX_ITEM_LABEL);
  if (!label) return null;
  const id = String(raw.id || "").trim() || slug(label, index);
  return { id, label };
}

export function normalizeChecklist(input) {
  if (!Array.isArray(input)) return [];
  const items = [];
  const seen = new Set();
  for (const raw of input) {
    const item = normalizeItem(raw, items.length);
    if (!item) continue;
    const key = item.label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(item);
    if (items.length >= MAX_CHECKLIST_ITEMS) break;
  }
  return items;
}

export function checklistFromCriteria(criteria) {
  const text = String(criteria ?? "").trim();
  if (!text) return [];
  const parts = text
    .split(/\s*(?:[·•]|\n|;|(?<=\.)\s+)/)
    .map((part) => part.replace(/\.$/, "").trim())
    .filter(Boolean);
  if (parts.length <= 1) return normalizeChecklist([text.replace(/\.$/, "")]);
  return normalizeChecklist(parts);
}

export function criteriaFromChecklist(items) {
  return normalizeChecklist(items)
    .map((item) => item.label)
    .join(" · ");
}

export function pactChecklist(pactOrInput = {}) {
  const listed = normalizeChecklist(pactOrInput.checklist);
  if (listed.length) return listed;
  return checklistFromCriteria(pactOrInput.criteria);
}

export function requireChecklist(input = {}) {
  const items = pactChecklist(input);
  if (items.length < MIN_CHECKLIST_ITEMS) {
    throw new Error("List what the referee has to see");
  }
  return items;
}

export function slipCriteria(input = {}) {
  const checklist = requireChecklist(input);
  const written = String(input.criteria ?? "").trim();
  return {
    checklist,
    criteria: written || criteriaFromChecklist(checklist),
  };
}

export function formatChecklistPrompt(items) {
  return normalizeChecklist(items)
    .map((item, i) => `${i + 1}. [${item.id}] ${item.label}`)
    .join("\n");
}

export function normalizeMarks(items, marks) {
  const list = normalizeChecklist(items);
  const rows = Array.isArray(marks) ? marks : [];
  return list.map((item) => {
    const hit = rows.find((row) => row?.id === item.id || row?.label === item.label);
    const pass = hit == null || hit.pass == null ? null : Boolean(hit.pass);
    const note = String(hit?.note ?? "").trim().slice(0, MAX_ITEM_NOTE);
    return { id: item.id, label: item.label, pass, note };
  });
}

export function allItemsHeld(marks) {
  return Array.isArray(marks) && marks.length > 0 && marks.every((row) => row.pass === true);
}

export function rationaleFromMarks(marks, lead = "") {
  const stamps = (marks || []).map((row) => {
    const stamp = row.pass === true ? "HOLD" : row.pass === false ? "MISS" : "OPEN";
    const note = row.note ? ` — ${row.note}` : "";
    return `${stamp} · ${row.label}${note}`;
  });
  const line = [lead, ...stamps].filter(Boolean).join(" ");
  return line.slice(0, 280);
}

export function mockItemMarks(items, { fileName, result } = {}) {
  const list = normalizeChecklist(items);
  const name = String(fileName || "").toLowerCase();
  if (!name) {
    return list.map((item) => ({
      id: item.id,
      label: item.label,
      pass: false,
      note: "No frame on the slip.",
    }));
  }
  if (/\b(cat|dog|meme)\b/.test(name) || result === "fail") {
    return list.map((item) => ({
      id: item.id,
      label: item.label,
      pass: false,
      note: "Frame is off-brief.",
    }));
  }
  if (/\b(blur|unsure|maybe)\b/.test(name) || result === "review") {
    return list.map((item, i) => ({
      id: item.id,
      label: item.label,
      pass: i === 0,
      note: i === 0 ? "Visible enough to hold." : "Too ambiguous to call.",
    }));
  }
  return list.map((item) => ({
    id: item.id,
    label: item.label,
    pass: true,
    note: "On the tape.",
  }));
}

export function attachChecklistToVerdict(verdict, input = {}, parsedItems) {
  const items = pactChecklist(input);
  if (!items.length || !verdict) return verdict;
  const fromModel =
    (Array.isArray(parsedItems) && parsedItems.length && parsedItems) ||
    (Array.isArray(verdict.items) && verdict.items.length && verdict.items) ||
    null;
  const marks = fromModel
    ? normalizeMarks(items, fromModel).map((row) => ({
        ...row,
        pass: row.pass == null ? verdict.result === "pass" : row.pass,
      }))
    : mockItemMarks(items, { fileName: input.fileName, result: verdict.result });
  return { ...verdict, items: marks };
}

export function friendItemMarks(pact, pass, itemMarks, reason = "") {
  const items = pactChecklist(pact);
  if (!items.length) return undefined;
  const graded = normalizeMarks(items, itemMarks).map((row) => ({
    ...row,
    pass: row.pass == null ? Boolean(pass) : row.pass,
    note: row.note || String(reason || "").trim(),
  }));
  return graded;
}

export function defaultGymChecklist() {
  return [
    { id: "sc_face", label: "Face visible" },
    { id: "sc_gym", label: "Gym floor or equipment visible" },
  ];
}
