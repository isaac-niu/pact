import { MAX_CHECKLIST_ITEMS } from "../lib/successCriteria.js";

export default function ChecklistEditor({ items, onChange }) {
  function setLabel(index, label) {
    onChange(items.map((item, i) => (i === index ? { ...item, label } : item)));
  }

  function addLine() {
    if (items.length >= MAX_CHECKLIST_ITEMS) return;
    onChange([...items, { id: `sc_new_${items.length}`, label: "" }]);
  }

  function scratchLine(index) {
    if (items.length <= 1) return;
    onChange(items.filter((_, i) => i !== index));
  }

  return (
    <fieldset className="opp-field checklist-field">
      <legend>Success criteria</legend>
      <p className="hint">
        Lines the referee has to hold. Each one gets a HOLD / MISS on the tape — not one
        free-text paragraph.
      </p>
      <ol className="checklist-edit">
        {items.map((item, index) => (
          <li key={item.id || index}>
            <label>
              Line {index + 1}
              <input
                value={item.label}
                onChange={(e) => setLabel(index, e.target.value)}
                placeholder={index === 0 ? "Face visible" : "Gym floor or equipment visible"}
                required
              />
            </label>
            <button
              type="button"
              className="btn btn-ghost checklist-scratch"
              onClick={() => scratchLine(index)}
              disabled={items.length <= 1}
            >
              Scratch
            </button>
          </li>
        ))}
      </ol>
      <button
        type="button"
        className="btn btn-ghost"
        onClick={addLine}
        disabled={items.length >= MAX_CHECKLIST_ITEMS}
      >
        Add a line
      </button>
    </fieldset>
  );
}
