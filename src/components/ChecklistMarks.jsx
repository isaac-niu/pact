function stampOf(pass) {
  if (pass === true) return { label: "HOLD", className: "hold" };
  if (pass === false) return { label: "MISS", className: "miss" };
  return { label: "OPEN", className: "open" };
}

export function ChecklistList({ items }) {
  if (!items?.length) return null;
  return (
    <ol className="checklist-read">
      {items.map((item) => (
        <li key={item.id}>{item.label}</li>
      ))}
    </ol>
  );
}

export function ChecklistGrade({ marks }) {
  if (!marks?.length) return null;
  return (
    <ol className="checklist-grade">
      {marks.map((row) => {
        const stamp = stampOf(row.pass);
        return (
          <li key={row.id} className={stamp.className}>
            <span className={`badge type-${stamp.className === "hold" ? "won" : stamp.className === "miss" ? "lost" : "review"}`}>
              {stamp.label}
            </span>
            <span>
              {row.label}
              {row.note ? <em className="hint"> — {row.note}</em> : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function ChecklistGradeForm({ items, marks, onChange }) {
  if (!items?.length) return null;

  function setMark(id, patch) {
    const next = items.map((item) => {
      const current = marks.find((row) => row.id === item.id) || {
        id: item.id,
        label: item.label,
        pass: null,
        note: "",
      };
      return item.id === id ? { ...current, label: item.label, ...patch } : current;
    });
    onChange(next);
  }

  return (
    <fieldset className="opp-field checklist-field">
      <legend>Grade each line</legend>
      <ol className="checklist-grade-form">
        {items.map((item) => {
          const mark = marks.find((row) => row.id === item.id);
          return (
            <li key={item.id}>
              <div className="checklist-line-head">{item.label}</div>
              <div className="tape-choice" role="radiogroup" aria-label={`${item.label} grade`}>
                <label className={`opp-card ${mark?.pass === true ? "on" : ""}`}>
                  <input
                    type="radio"
                    name={`grade-${item.id}`}
                    checked={mark?.pass === true}
                    onChange={() => setMark(item.id, { pass: true })}
                  />
                  <span>
                    <b>Hold</b>
                    <em>This line stands.</em>
                  </span>
                </label>
                <label className={`opp-card ${mark?.pass === false ? "on" : ""}`}>
                  <input
                    type="radio"
                    name={`grade-${item.id}`}
                    checked={mark?.pass === false}
                    onChange={() => setMark(item.id, { pass: false })}
                  />
                  <span>
                    <b>Miss</b>
                    <em>This line fades.</em>
                  </span>
                </label>
              </div>
            </li>
          );
        })}
      </ol>
    </fieldset>
  );
}
