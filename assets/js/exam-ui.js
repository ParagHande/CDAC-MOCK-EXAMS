// ============================================================
// exam-ui.js — Review panel, revisit, confirm modal,
//              diagram renderers, result screen
//
// Responsibilities:
//   • exam.revisitMarked Set initialisation
//   • openReview() / closeReview()
//   • confirmAndSubmit()
//   • toggleRevisit() / refreshDots() (revisit-aware version)
//   • updateRevisitButton()
//   • normalizeDiagramData() / parseSchemaString() / parseERDString()
//   • renderDiagram() — full diagram renderer for all types
//   • drawTree() / drawGraph() / drawStack()
//   • showConfirm()
//
// Depends on: exam-engine.js (exam object, LETTERS, escapeHtml,
//             goToQuestion, submitExam, enterFullscreen)
// ============================================================

exam.revisitMarked = new Set();

// CHANGE: Open review panel — builds the full question list
function openReview() {
  if (exam.submitted) return;

  const list = document.getElementById("review-list");
  list.innerHTML = "";

  let answeredCount = 0;
  let skippedCount = 0;

  exam.questions.forEach((q, i) => {
    // CHANGE: In openReview(), update each item to show revisit status
    // Replace the isAnswered check with this:

    const isAnswered = exam.userAnswers[i] !== null;
    const isRevisit = exam.revisitMarked.has(i);

    // Status label
    let statusClass, statusText;
    if (isAnswered && isRevisit) {
      statusClass = "skipped"; // answered but flagged for revisit
      statusText = `${LETTERS[exam.userAnswers[i]]}: answered (revisit)`;
    } else if (isAnswered) {
      statusClass = "answered";
      statusText = `${LETTERS[exam.userAnswers[i]]}: ${(q.options[exam.userAnswers[i]] || "").slice(0, 35)}`;
    } else if (isRevisit) {
      statusClass = "skipped";
      statusText = "Marked for revisit";
    } else {
      statusClass = "skipped";
      statusText = "Not answered";
    }

    const item = document.createElement("div");
    item.className = "review-item";

    // CHANGE: Clicking a row closes the panel and jumps to that question
    item.onclick = () => {
      closeReview();
      goToQuestion(i);
    };

    // CHANGE: Show selected answer text if answered, else "Not answered"
    const selectedIndex = exam.userAnswers[i];
    const answerText = isAnswered
      ? `${LETTERS[selectedIndex]}: ${(q.options[selectedIndex] || "").slice(0, 40)}${q.options[selectedIndex]?.length > 40 ? "…" : ""}`
      : "Not answered";

    item.innerHTML = `
      <div class="review-item-dot ${isAnswered ? "answered" : "skipped"}"></div>
      <div class="review-item-body">
          <div class="review-item-qnum">Question ${i + 1}</div>
          <div class="review-item-qtext">${q.question.slice(0, 90)}${q.question.length > 90 ? "…" : ""}</div>
          <div class="review-item-hint">Click to revisit this question</div>
      </div>
      <div class="review-item-ans ${isAnswered ? "answered" : "skipped"}">${answerText}</div>
  `;

    list.appendChild(item);
  });

  // CHANGE: Update summary chips with current counts
  document.getElementById("rv-total").textContent =
    `${exam.questions.length} Total`;
  document.getElementById("rv-answered").textContent =
    `${answeredCount} Answered`;
  document.getElementById("rv-skipped").textContent =
    `${skippedCount} Skipped`;

  document.getElementById("review-overlay").classList.add("show");
}

// CHANGE: Close review panel — returns student to exam
function closeReview() {
  document.getElementById("review-overlay").classList.remove("show");
}

// CHANGE: Confirm before final submit — warns if questions are unanswered
// CHANGE: Replace old confirmAndSubmit() with custom modal version
function confirmAndSubmit() {
  if (exam.submitted) return;

  const answered = exam.userAnswers.filter((a) => a !== null).length;
  const skipped = exam.questions.length - answered;
  const total = exam.questions.length;

  showConfirm({
    title: "Submit Exam?",
    message:
      skipped > 0
        ? `You have ${skipped} unanswered question${skipped > 1 ? "s" : ""}. Once submitted you cannot go back.`
        : "You have answered all questions. Ready to submit?",
    stats: [
      { type: "answered", label: `${answered} Answered` },
      { type: "skipped", label: `${skipped} Unanswered` },
      { type: "total", label: `${total} Total` },
    ],
    onOk: () => {
      closeReview();
      submitExam();
    },
    onCancel: () => {
      // do nothing — stay on exam
    },
  });
}

// ============================================================
// CHANGE: Revisit toggle — marks question for later review
// Like the orange "Revisit" button in the CDAC screenshot
// ============================================================

// Track which questions are marked for revisit
// This Set stores question indexes (0-based)

function toggleRevisit() {
  const idx = exam.currentIndex;
  const btn = document.getElementById("revisit-btn");

  if (exam.revisitMarked.has(idx)) {
    // Already marked — unmark it
    exam.revisitMarked.delete(idx);
    btn.classList.remove("active");
    btn.style.background = "#f8fafc";
    btn.style.borderColor = "#cbd5e1";
    btn.style.color = "#64748b";
  } else {
    // Not marked — mark it
    exam.revisitMarked.add(idx);
    btn.classList.add("active");
    btn.style.background = "#fff7ed";
    btn.style.borderColor = "#fb923c";
    btn.style.color = "#ea580c";
  }

  // Update the nav dot color to show orange for revisit
  refreshDots();
}

// CHANGE: Update refreshDots() to also handle revisit state
// Replace your existing refreshDots() with this:
function refreshDots() {
  exam.questions.forEach((_, i) => {
    const dot = document.getElementById(`dot-${i}`);
    if (!dot) return;

    // Reset classes first
    dot.className = "q-dot";

    if (i === exam.currentIndex) {
      // Currently viewing — blue
      dot.classList.add("active");
    } else if (exam.revisitMarked.has(i)) {
      // Marked for revisit — orange
      dot.classList.add("revisit");
    } else if (exam.userAnswers[i] !== null) {
      // Answered — green
      dot.classList.add("answered");
    }
    // else: unattempted — default gray
  });
}

// CHANGE: Update renderQuestion() to restore revisit button state when navigating
// Add this at the end of your existing renderQuestion() function:
function updateRevisitButton() {
  const btn = document.getElementById("revisit-btn");
  if (!btn) return;

  if (exam.revisitMarked.has(exam.currentIndex)) {
    btn.classList.add("active");
    btn.style.background = "#fff7ed";
    btn.style.borderColor = "#fb923c";
    btn.style.color = "#ea580c";
  } else {
    btn.classList.remove("active");
    btn.style.background = "#f8fafc";
    btn.style.borderColor = "#cbd5e1";
    btn.style.color = "#64748b";
  }
}

// ============================================================
// ─────────────────────────────────────────────────────────────────────────────
// normalizeDiagramData()
// Converts the structured object-array values from the JSON files into the
// flat string-array format that renderDiagram() expects.
// Called automatically at the top of renderDiagram() before any rendering.
// ─────────────────────────────────────────────────────────────────────────────
function normalizeDiagramData(type, data) {
  if (!data || !Array.isArray(data.values)) return data;

  // ── DBT-specific types ─────────────────────────────────────────────────────
  // "table"   → values is [{table, rows:[{col:val,...}]}, ...]  (multi-table)
  //             OR already string[]  (legacy)
  // "data-set"→ values is [{col:val,...}, ...]  (flat row objects)
  // "schema"  → values is [] (empty; representation carries all info)
  // "erd"     → values is [] (empty; representation carries all info)
  // These are handled directly in renderDiagram() — pass through unchanged.
  if (type === "data-set" || type === "schema" || type === "erd")
    return data;

  // For "table": if values[0] has a "table" key it's the DBT multi-table format —
  // pass through so renderDiagram can handle it natively.
  if (type === "table") {
    if (data.values.length === 0) return data;
    if (
      typeof data.values[0] === "object" &&
      !Array.isArray(data.values[0]) &&
      data.values[0].table
    )
      return data;
    // Legacy: already string[] or array-of-arrays — pass through
    return data;
  }

  // "case" / "chart" — handled downstream as-is
  if (type === "case" || type === "chart") return data;

  // If already strings, nothing to do
  if (data.values.length === 0 || typeof data.values[0] === "string")
    return data;

  // If values[0] is an array (row of cells), it belongs to table/case — pass through unchanged.
  if (Array.isArray(data.values[0])) return data;

  const lines = [];
  const vals = data.values;

  // ── POINTER ────────────────────────────────────────────────────────────────
  if (type === "pointer") {
    vals.forEach((v) => {
      if (v.name !== undefined) {
        const addr = v.address ? ` @ ${v.address}` : "";
        const holds = v.holds
          ? ` → ${v.holds}`
          : v.value !== undefined
            ? ` = ${v.value}`
            : "";
        const extra = v.is_reference_to
          ? ` (alias of ${v.is_reference_to})`
          : "";
        lines.push(`${v.name}${addr}${holds}${extra}`);
      } else if (v.operation !== undefined) {
        lines.push(
          `op: ${v.operation}  →  ${v.effect || v.result || ""}`,
        );
      } else if (v.segment !== undefined) {
        lines.push(`[${v.segment}] ${v.content || ""}`);
      } else if (v.attempt !== undefined) {
        lines.push(`attempt: ${v.attempt}  →  ${v.result || ""}`);
      } else if (v.pointer !== undefined) {
        lines.push(`${v.pointer}  →  ${v.value || v.holds || ""}`);
      } else {
        lines.push(
          Object.entries(v)
            .map(([k, val]) => `${k}: ${val}`)
            .join("   "),
        );
      }
    });
  }

  // ── ARRAY ──────────────────────────────────────────────────────────────────
  else if (type === "array") {
    const indices = [],
      values2 = [];
    vals.forEach((v) => {
      if (v.index !== undefined) {
        indices.push(String(v.index));
        if (v.before !== undefined) {
          values2.push(String(v.before));
        } else if (v.value !== undefined) {
          values2.push(String(v.value));
        } else {
          values2.push("?");
        }
      } else if (v.expression !== undefined) {
        lines.push(`--- Expression`);
        lines.push(`${v.expression} = ${v.result}`);
      } else if (v.accessed !== undefined) {
        lines.push(`--- Accessed`);
        (Array.isArray(v.accessed) ? v.accessed : [v.accessed]).forEach(
          (a) => lines.push(`  ${a}`),
        );
      } else if (v.operation !== undefined) {
        lines.push(`--- Operation`);
        lines.push(`${v.operation}  →  ${v.effect || ""}`);
      }
    });
    if (indices.length > 0) {
      lines.unshift(`Value: ${values2.join("   ")}`);
      lines.unshift(`Index: ${indices.join("   ")}`);
    }
  }

  // ── MEMORY ─────────────────────────────────────────────────────────────────
  else if (type === "memory") {
    const hasStack = vals.some(
      (v) => v.region === "stack" || v.object || v.step !== undefined,
    );
    const hasHeap = vals.some(
      (v) => v.region === "heap" || v.heap_address || v.location,
    );

    if (hasStack && hasHeap) {
      vals.forEach((v) => {
        if (v.region === "stack") {
          lines.push(
            `Stack: ${v.name || ""} = ${v.value || v.holds || ""}   `,
          );
        } else if (v.region === "heap") {
          lines.push(
            `   Heap: [${v.address || ""}] = ${v.value || ""}  status: ${v.status || "allocated"}`,
          );
        } else if (v.step !== undefined) {
          lines.push(`--- Step ${v.step}`);
          lines.push(v.event || v.action || "");
        } else if (v.name !== undefined) {
          const addr = v.address ? ` @ ${v.address}` : "";
          const val =
            v.before !== undefined
              ? ` = ${v.before}`
              : v.value !== undefined
                ? ` = ${v.value}`
                : "";
          lines.push(`${v.name}${addr}${val}`);
        } else {
          lines.push(
            Object.entries(v)
              .map(([k, val]) => `${k}: ${val}`)
              .join("   "),
          );
        }
      });
    } else {
      vals.forEach((v) => {
        if (v.step !== undefined) {
          lines.push(`--- Step ${v.step}`);
          if (v.event) lines.push(v.event);
          if (v.action) lines.push(v.action);
          if (v.output) lines.push(`output: ${v.output}`);
          Object.entries(v).forEach(([k, val]) => {
            if (!["step", "event", "action", "output"].includes(k))
              lines.push(`  ${k}: ${val}`);
          });
        } else if (v.name !== undefined) {
          const addr = v.address ? ` @ ${v.address}` : "";
          const alias = v.alias_of ? `  (alias of ${v.alias_of})` : "";
          const val =
            v.before !== undefined
              ? ` = ${v.before}`
              : v.value !== undefined
                ? ` = ${v.value}`
                : "";
          lines.push(`${v.name}${addr}${val}${alias}`);
        } else if (v.object !== undefined) {
          lines.push(`[object: ${v.object}]`);
          Object.entries(v).forEach(([k, val]) => {
            if (k !== "object") lines.push(`  ${k}: ${val}`);
          });
        } else if (v.address !== undefined) {
          lines.push(
            `[${v.address}] = ${v.value || "?"}  (${v.status || "allocated"})`,
          );
        } else if (v.heap_address !== undefined) {
          lines.push(
            `Heap[${v.heap_address}]: ${v.value || "?"}  status: ${v.status || "allocated"}`,
          );
        } else if (v.pointer !== undefined) {
          lines.push(
            `${v.pointer}  status: ${v.status_after_delete || v.status || ""}`,
          );
        } else if (v.conclusion !== undefined) {
          lines.push(`--- ${v.conclusion}`);
        } else {
          lines.push(
            Object.entries(v)
              .map(([k, val]) => `${k}: ${val}`)
              .join("   "),
          );
        }
      });
    }
  }

  // ── CLASS ──────────────────────────────────────────────────────────────────
  else if (type === "class") {
    vals.forEach((v) => {
      if (v.class !== undefined) {
        const abs =
          v.role === "virtual base" || v.is_abstract ? " (abstract)" : "";
        const inh = v.inherits
          ? ` extends ${Array.isArray(v.inherits) ? v.inherits.join(", ") : v.inherits}`
          : "";
        lines.push(`${v.class}${abs}`);
        if (v.constructor_order !== undefined)
          lines.push(
            `  + constructor #${v.constructor_order}  [concrete]`,
          );
        if (v.destructor_order !== undefined)
          lines.push(`  + destructor #${v.destructor_order}  [concrete]`);
        if (inh) lines.push(`  ${inh.trim()}`);
        if (v.order !== undefined)
          lines.push(`  + construction order: ${v.order}  [concrete]`);
        if (v.vtable_entry)
          lines.push(`  + vtable: ${v.vtable_entry}  [concrete]`);
        if (v.show) lines.push(`  + show(): ${v.show}  [override]`);
        if (v.destructor) lines.push(`  + ${v.destructor}  [concrete]`);
        if (v.member)
          lines.push(
            `  + ${v.member} = ${v.value !== undefined ? v.value : "?"}  @ offset ${v.offset || 0}  [concrete]`,
          );
        if (v.role === "virtual base") lines.push(`  + role: ${v.role}`);
      } else if (v.rule !== undefined) {
        lines.push(`--- Rule`);
        lines.push(v.rule);
      } else if (v.dispatch !== undefined) {
        lines.push(`--- Dispatch: ${v.dispatch}`);
      } else if (v.unique_ptr !== undefined) {
        lines.push(`--- smart_ptr note`);
        lines.push(v.unique_ptr);
      } else if (v.problem !== undefined) {
        lines.push(`--- Problem`);
        lines.push(v.problem);
      } else if (v.fix !== undefined) {
        lines.push(`--- Fix`);
        lines.push(v.fix);
      } else if (v.result !== undefined) {
        return;
      } else {
        lines.push(
          Object.entries(v)
            .map(([k, val]) => `${k}: ${val}`)
            .join("   "),
        );
      }
    });
  }

  // ── EXECUTION ──────────────────────────────────────────────────────────────
  else if (type === "execution") {
    lines.push("START");
    vals.forEach((v) => {
      if (v.step !== undefined) {
        const ev = v.event || v.action || "";
        const st = v.status ? ` [${v.status}]` : "";
        lines.push(`Step ${v.step}: ${ev}${st}`);
      } else if (v.call !== undefined) {
        lines.push(`call: ${v.call}  (frame ${v.frame || ""})`);
      } else if (v.output !== undefined) {
        return;
      } else if (v.case !== undefined) {
        lines.push(`${v.case}: ${v.action || ""}`);
      } else if (v.cast !== undefined) {
        lines.push(`${v.cast}  →  ${v.result || ""}`);
      } else if (v.malloc !== undefined) {
        lines.push(v.malloc);
      } else if (v.new_delete !== undefined) {
        lines.push(`new/delete: ${v.new_delete}`);
      } else {
        lines.push(
          Object.entries(v)
            .map(([k, val]) => `${k}: ${val}`)
            .join("   "),
        );
      }
    });
    lines.push("END");
  }

  // ── FALLBACK ───────────────────────────────────────────────────────────────
  else {
    vals.forEach((v) => {
      lines.push(
        Object.entries(v)
          .map(([k, val]) => `${k}: ${val}`)
          .join("   "),
      );
    });
  }

  return { representation: data.representation, values: lines };
}

// ─────────────────────────────────────────────────────────────────────────────
// parseSchemaString()
// Parses a pipe-separated schema string like:
//   "DEPT(dept_id PK, dept_name) | EMP(emp_id PK, emp_name, salary, dept_id FK -> DEPT.dept_id)"
// Returns array of { tableName, columns:[{name, tags:[]}] }
// ─────────────────────────────────────────────────────────────────────────────
function parseSchemaString(repr) {
  if (!repr) return [];
  const tables = [];
  // Split on " | " but not inside parentheses
  const parts = repr.split(/\s*\|\s*/);
  parts.forEach((part) => {
    const m = part.match(/^(\w+)\((.+)\)$/);
    if (!m) return;
    const tableName = m[1];
    const colStr = m[2];
    // Split columns by comma, but respect nested parens (FK refs)
    const cols = [];
    let depth = 0,
      cur = "";
    for (const ch of colStr + ",") {
      if (ch === "(") {
        depth++;
        cur += ch;
      } else if (ch === ")") {
        depth--;
        cur += ch;
      } else if (ch === "," && depth === 0) {
        const c = cur.trim();
        if (c) cols.push(c);
        cur = "";
      } else {
        cur += ch;
      }
    }
    const columns = cols.map((c) => {
      const tags = [];
      const upper = c.toUpperCase();
      if (upper.includes(" PK")) tags.push("PK");
      if (upper.includes(" FK")) tags.push("FK");
      if (upper.includes(" UNIQUE")) tags.push("UQ");
      if (upper.includes(" NOT NULL")) tags.push("NN");
      // Clean display name: remove tag annotations
      const name = c
        .replace(/\s+PK/gi, "")
        .replace(/\s+FK[^,)]*(?=,|$|\))/gi, " FK")
        .replace(/->[\w.]+/g, "")
        .replace(/\s+UNIQUE/gi, "")
        .replace(/\s+NOT\s+NULL/gi, "")
        .replace(/\s+INT/gi, "")
        .trim();
      return { name, tags };
    });
    tables.push({ tableName, columns });
  });
  return tables;
}

// ─────────────────────────────────────────────────────────────────────────────
// parseERDString()
// Parses strings like:
//   "CUSTOMER(cust_id PK, name) ---[1]---<places>---[M]--- ORDERS(order_id PK, cust_id FK, amount)"
//   "DOCTOR(doc_id PK, name) ---[M]---<TREATMENT(...)>---[N]--- PATIENT(pat_id PK, name)"
// Returns { entities:[], relationships:[] }
// ─────────────────────────────────────────────────────────────────────────────
function parseERDString(repr) {
  if (!repr) return { entities: [], relationships: [] };

  const entities = [];
  const relationships = [];

  // Match all TABLE(cols) patterns
  const entityRe = /(\w+)\(([^)]+)\)/g;
  let em;
  while ((em = entityRe.exec(repr)) !== null) {
    const tName = em[1];
    const cols = em[2].split(",").map((c) => {
      const tags = [];
      if (/ PK/i.test(c)) tags.push("PK");
      if (/ FK/i.test(c)) tags.push("FK");
      return {
        name: c
          .replace(/->/g, "")
          .replace(/ PK| FK/gi, "")
          .trim(),
        tags,
      };
    });
    entities.push({ name: tName, cols });
  }

  // Extract cardinality markers  [1] [M] [N] [0..1]
  const cardRe = /\[([^\]]+)\]/g;
  const cards = [];
  let cm;
  while ((cm = cardRe.exec(repr)) !== null) cards.push(cm[1]);

  // Extract relationship name from <...> that is NOT a table definition
  const relRe = /<([^>()]+)>/g;
  let rm;
  while ((rm = relRe.exec(repr)) !== null) {
    relationships.push({ label: rm[1].trim() });
  }

  // Cardinality: usually [left] [right] pair
  if (cards.length >= 2 && entities.length >= 2) {
    const rel = relationships[0] || { label: "" };
    rel.from = entities[0].name;
    rel.to = entities[entities.length - 1].name;
    rel.cardLeft = cards[0];
    rel.cardRight = cards[cards.length - 1];
    if (!relationships.length) relationships.push(rel);
    else relationships[0] = rel;
  }

  return { entities, relationships };
}

// ─────────────────────────────────────────────────────────────────────────────
// renderDiagram()
// ─────────────────────────────────────────────────────────────────────────────
function renderDiagram(q) {
  const container = document.getElementById("q-diagram");

  if (!q.diagramType || !q.diagramData || q.diagramType === "none") {
    container.style.display = "none";
    container.innerHTML = "";
    return;
  }

  container.style.display = "block";
  container.innerHTML = "";

  const type = q.diagramType;
  // Normalize object-array values → string-array before rendering
  const data = normalizeDiagramData(type, q.diagramData);

  // ── Shared CSS ────────────────────────────────────────────────────────
  const css = `<style>
.dw {
font-family: 'DM Sans', sans-serif;
font-size: 13px;
color: #0f172a;
line-height: 1.6;
}
.dl {
font-size: 10px; font-weight: 700; color: #64748b;
text-transform: uppercase; letter-spacing: .08em;
padding: 6px 10px; background: #f8fafc;
border-radius: 6px; margin-bottom: 10px;
border: 1px solid #e2e8f0; display: inline-block;
}

/* ── TABLE & CASE ── */
.dt { width:100%; border-collapse:collapse; font-size:13px; }
.dt th {
background:#f1f5f9; color:#475569; font-weight:700;
text-align:center; padding:8px 10px;
border:1px solid #e2e8f0; font-size:12px;
}
.dt td {
text-align:center; padding:7px 10px;
border:1px solid #e2e8f0; color:#0f172a;
background:#fff; font-size:13px;
}
.dt tr:hover td { background:#f8fafc; }
.dt td:first-child {
font-weight:600; text-align:left;
background:#f8fafc; color:#334155;
}
.dc th {
background:#0f172a; color:#fff; padding:9px 14px;
text-align:left; font-size:12px; font-weight:700;
}
.dc td {
padding:8px 14px; border-bottom:1px solid #e2e8f0;
color:#0f172a; background:#fff; font-size:13px;
}
.dc tr:nth-child(even) td { background:#f8fafc; }
.dc td:not(:first-child) { text-align:right; }

/* ── BAR CHART ── */
.bar-row { display:flex; align-items:center; gap:8px; margin:5px 0; }
.bar-lbl { width:100px; font-size:12px; color:#475569; text-align:right; flex-shrink:0; }
.bar-trk { flex:1; background:#e2e8f0; border-radius:4px; height:24px; position:relative; }
.bar-fil {
height:100%; background:#2563eb; border-radius:4px;
display:flex; align-items:center; justify-content:flex-end;
padding-right:8px; min-width:30px;
}
.bar-val { font-size:11px; font-weight:700; color:#fff; }

/* ── PIE ── */
.pie-wrap { display:flex; gap:20px; align-items:center; flex-wrap:wrap; }
.pie-leg  { display:flex; flex-direction:column; gap:6px; }
.pie-item { display:flex; align-items:center; gap:7px; font-size:12px; color:#334155; }
.pie-dot  { width:10px; height:10px; border-radius:2px; flex-shrink:0; }

/* ── NUMBER GRID ── */
.ng { border-collapse:collapse; }
.ng td {
width:56px; height:56px; text-align:center; vertical-align:middle;
border:1px solid #e2e8f0; font-weight:600; color:#0f172a;
background:#fff; font-size:15px;
}
.ng td.miss { background:#fef3c7; color:#92400e; font-weight:700; font-size:18px; }
.ng-rule { margin-top:8px; font-size:12px; color:#475569; }

/* ── ARRANGEMENT ── */
.arr-wrap { display:flex; flex-direction:column; align-items:flex-start; gap:12px; }
.arr-con  { font-size:12px; color:#475569; line-height:1.85; }

/* ── MEMORY ── */
.jd-memory {
display:flex; gap:0; border-radius:10px;
overflow:hidden; border:1.5px solid #e2e8f0;
}
.jd-memory-col { flex:1; display:flex; flex-direction:column; }
.jd-memory-col-header {
background:#1e293b; color:#94a3b8; font-size:10px;
font-weight:700; letter-spacing:0.1em; text-transform:uppercase;
padding:8px 12px; text-align:center; flex-shrink:0;
}
.jd-memory-col:first-child { border-right:2px solid #334155; }
.jd-memory-row {
padding:7px 12px; border-bottom:1px solid #e2e8f0;
font-size:12.5px; min-height:34px; display:flex;
align-items:center; background:#fff;
font-family:'Courier New',monospace; white-space:pre;
word-break:break-all; overflow-x:auto;
}
.jd-memory-row:last-child { border-bottom:none; }
.jd-memory-row.divider {
background:#f1f5f9; color:#64748b; font-size:11px;
font-style:italic; letter-spacing:0.02em;
justify-content:center; font-family:'DM Sans',sans-serif;
}

/* ── REFERENCE ── */
.jd-ref-line {
display:flex; align-items:flex-start; gap:0; padding:4px 0;
font-family:'Courier New',monospace; font-size:12.5px; color:#1e293b;
}
.jd-ref-line.section-title {
font-family:'DM Sans',sans-serif; font-size:11px; font-weight:700;
color:#64748b; text-transform:uppercase; letter-spacing:0.07em;
padding:10px 0 4px; border-bottom:1px solid #e2e8f0;
margin-bottom:4px; font-style:normal; display:block;
}
.jd-ref-line.blank { padding:6px 0; }
.jd-ref-line.assertion {
font-family:'DM Sans',sans-serif; font-size:12.5px;
font-style:italic; color:#475569; padding:2px 0;
}

/* ── ARRAY ── */
.jd-array-wrap { display:flex; flex-direction:column; gap:14px; }
.jd-array-grid {
display:flex; border-radius:8px; overflow:hidden;
border:1.5px solid #cbd5e1; width:fit-content;
}
.jd-array-cell {
width:52px; height:52px; display:flex;
align-items:center; justify-content:center;
font-weight:700; font-size:15px; color:#0f172a;
border-right:1px solid #cbd5e1; background:#fff;
position:relative; flex-shrink:0;
}
.jd-array-cell:last-child { border-right:none; }
.jd-array-cell.unknown { background:#fef9c3; color:#854d0e; font-style:italic; }
.jd-array-idx {
position:absolute; top:3px; left:0; right:0;
text-align:center; font-size:9px; font-weight:600;
color:#94a3b8; font-family:'Courier New',monospace;
}
.jd-array-code {
background:#1e293b; color:#e2e8f0; border-radius:8px;
padding:10px 16px; font-family:'Courier New',monospace;
font-size:12.5px; line-height:1.65;
white-space:pre-wrap; word-break:break-word;
}
.jd-array-label {
font-size:11px; font-weight:700; color:#64748b;
text-transform:uppercase; letter-spacing:0.07em; margin-bottom:6px;
}

/* ── CLASS ── */
.jd-class-grid { display:flex; flex-wrap:wrap; gap:12px; align-items:flex-start; }
.jd-class-box {
border:1.5px solid #e2e8f0; border-radius:10px;
overflow:hidden; min-width:170px; flex:1;
box-shadow:0 2px 8px rgba(15,23,42,0.06);
}
.jd-class-box.abstract { border-color:#c7d2fe; }
.jd-class-box.concrete { border-color:#bbf7d0; }
.jd-class-header {
padding:10px 14px; font-weight:700; font-size:13px;
display:flex; align-items:center; gap:7px;
}
.jd-class-box.abstract .jd-class-header { background:#eef2ff; color:#3730a3; }
.jd-class-box.concrete .jd-class-header { background:#f0fdf4; color:#15803d; }
.jd-class-box.usage .jd-class-header    { background:#fef9c3; color:#854d0e; }
.jd-class-box.usage { border-color:#fde047; }
.jd-class-tag {
font-size:9px; font-weight:600; padding:2px 6px;
border-radius:4px; letter-spacing:0.06em; text-transform:uppercase;
}
.jd-class-box.abstract .jd-class-tag { background:#c7d2fe; color:#3730a3; }
.jd-class-box.concrete .jd-class-tag { background:#bbf7d0; color:#15803d; }
.jd-class-body {
padding:8px 14px 10px; font-size:12px;
font-family:'Courier New',monospace; color:#334155;
border-top:1px solid #f1f5f9; line-height:1.7;
}
.jd-class-method { display:flex; gap:6px; align-items:center; }
.jd-class-method-tag {
font-size:9px; padding:1px 5px; border-radius:3px;
font-weight:700; flex-shrink:0; font-family:'DM Sans',sans-serif;
}
.jd-class-method-tag.abstract  { background:#c7d2fe; color:#3730a3; }
.jd-class-method-tag.override  { background:#bbf7d0; color:#15803d; }
.jd-class-method-tag.concrete  { background:#e2e8f0; color:#475569; }
.jd-class-arrow {
display:flex; align-items:center; justify-content:center;
padding:4px; font-size:18px; color:#94a3b8;
font-weight:300; align-self:center;
}
.jd-class-usage-block {
background:#fefce8; border:1.5px solid #fde047;
border-radius:10px; padding:12px 16px;
font-family:'Courier New',monospace; font-size:12.5px;
color:#713f12; line-height:1.75;
white-space:pre-wrap; word-break:break-word; width:100%;
}
.jd-class-usage-label {
font-family:'DM Sans',sans-serif; font-size:10px;
font-weight:700; color:#a16207;
text-transform:uppercase; letter-spacing:0.08em; margin-bottom:6px;
}

/* ── EXECUTION ── */
.jd-exec-wrap {
display:flex; flex-direction:column; align-items:flex-start;
gap:0; position:relative; padding-left:18px;
}
.jd-exec-wrap::before {
content:''; position:absolute; left:8px;
top:20px; bottom:20px; width:2px;
background:#e2e8f0; border-radius:2px;
}
.jd-exec-step {
display:flex; align-items:center; gap:10px;
padding:6px 0; position:relative; width:100%;
}
.jd-exec-dot {
width:16px; height:16px; border-radius:50%;
flex-shrink:0; z-index:1; display:flex;
align-items:center; justify-content:center; margin-left:-24px;
}
.jd-exec-dot.start   { background:#0d9488; box-shadow:0 0 0 3px #ccfbf1; }
.jd-exec-dot.block   { background:#2563eb; box-shadow:0 0 0 3px #dbeafe; }
.jd-exec-dot.arrow   { background:transparent; color:#94a3b8; font-size:13px; }
.jd-exec-dot.end     { background:#64748b; box-shadow:0 0 0 3px #f1f5f9; }
.jd-exec-dot.special { background:#7c3aed; box-shadow:0 0 0 3px #ede9fe; }
.jd-exec-box {
flex:1; padding:9px 14px; border-radius:8px;
font-size:13px; font-weight:500; line-height:1.4;
border:1.5px solid #e2e8f0; background:#fff; color:#1e293b;
}
.jd-exec-box.start-box { background:#f0fdfa; border-color:#5eead4; color:#0f766e; font-weight:700; }
.jd-exec-box.end-box   { background:#f8fafc; border-color:#cbd5e1; color:#475569; font-style:italic; }
.jd-exec-box.arrow-box { background:transparent; border:none; color:#64748b; font-size:12px; padding:2px 14px; }
.jd-exec-box.exception { background:#fef2f2; border-color:#fca5a5; color:#991b1b; }
.jd-exec-box.always    { background:#fef9c3; border-color:#fde047; color:#854d0e; }
.jd-exec-box.catch-box { background:#eff6ff; border-color:#93c5fd; color:#1d4ed8; }
.jd-exec-annot {
font-size:11px; color:#64748b;
font-style:italic; padding-left:4px; flex-shrink:0;
}

/* ══════════════════════════════════════════
 DBT-SPECIFIC: DATA-SET, SCHEMA, ERD
══════════════════════════════════════════ */

/* ── DATA-SET ── */
.dbt-dataset-wrap { display:flex; flex-direction:column; gap:4px; }
.dbt-dataset-label {
font-size:10px; font-weight:700; color:#64748b;
text-transform:uppercase; letter-spacing:0.08em;
margin-bottom:6px;
}
.dbt-dataset-table { width:100%; border-collapse:collapse; font-size:13px; }
.dbt-dataset-table th {
background:#1e293b; color:#e2e8f0; padding:8px 12px;
text-align:left; font-size:11.5px; font-weight:700;
font-family:'Courier New',monospace; border:1px solid #334155;
}
.dbt-dataset-table td {
padding:7px 12px; border:1px solid #e2e8f0;
color:#0f172a; background:#fff; font-size:12.5px;
font-family:'Courier New',monospace;
}
.dbt-dataset-table tr:nth-child(even) td { background:#f8fafc; }
.dbt-dataset-table td.null-cell {
color:#94a3b8; font-style:italic;
}
.dbt-dataset-table th:first-child,
.dbt-dataset-table td:first-child { font-weight:700; }

/* ── SCHEMA ── */
.dbt-schema-wrap {
display:flex; flex-wrap:wrap; gap:14px; align-items:flex-start;
}
.dbt-schema-table {
border:1.5px solid #e2e8f0; border-radius:10px;
overflow:hidden; min-width:160px;
box-shadow:0 2px 8px rgba(15,23,42,0.06); flex:1; max-width:280px;
}
.dbt-schema-header {
background:#1e293b; color:#f1f5f9;
padding:9px 14px; font-size:13px; font-weight:700;
font-family:'Courier New',monospace; letter-spacing:0.02em;
}
.dbt-schema-col {
display:flex; align-items:center; gap:6px;
padding:6px 14px; border-bottom:1px solid #f1f5f9;
font-size:12px; font-family:'Courier New',monospace; color:#334155;
}
.dbt-schema-col:last-child { border-bottom:none; }
.dbt-schema-col:hover { background:#f8fafc; }
.dbt-schema-badge {
font-size:9px; font-weight:700; padding:2px 5px;
border-radius:4px; flex-shrink:0; letter-spacing:0.04em;
text-transform:uppercase;
}
.dbt-schema-badge.pk { background:#fef3c7; color:#92400e; }
.dbt-schema-badge.fk { background:#dbeafe; color:#1e40af; }
.dbt-schema-badge.uq { background:#f3e8ff; color:#6b21a8; }
.dbt-schema-badge.nn { background:#dcfce7; color:#15803d; }
.dbt-schema-col-name { flex:1; color:#1e293b; }
.dbt-schema-arrow {
display:flex; align-items:center; justify-content:center;
font-size:22px; color:#94a3b8; padding:0 2px;
align-self:center; flex-shrink:0; margin-top:20px;
}

/* ── ERD ── */
.dbt-erd-wrap { display:flex; flex-direction:column; gap:14px; }
.dbt-erd-diagram {
display:flex; align-items:center; gap:0;
flex-wrap:nowrap; overflow-x:auto; padding:4px 2px;
}
.dbt-erd-entity {
border:2px solid #2563eb; border-radius:10px;
overflow:hidden; min-width:150px; flex-shrink:0;
box-shadow:0 2px 8px rgba(37,99,235,0.10);
}
.dbt-erd-entity-header {
background:#2563eb; color:#fff;
padding:9px 14px; font-size:13px; font-weight:700;
font-family:'Courier New',monospace;
}
.dbt-erd-entity-col {
display:flex; align-items:center; gap:6px;
padding:5px 12px; border-bottom:1px solid #eff6ff;
font-size:11.5px; font-family:'Courier New',monospace; color:#334155;
}
.dbt-erd-entity-col:last-child { border-bottom:none; }
.dbt-erd-entity-col:hover { background:#eff6ff; }
.dbt-erd-badge {
font-size:9px; font-weight:700; padding:1px 5px;
border-radius:3px; flex-shrink:0; text-transform:uppercase;
}
.dbt-erd-badge.pk { background:#fef3c7; color:#92400e; }
.dbt-erd-badge.fk { background:#dbeafe; color:#1e40af; }
.dbt-erd-connector {
display:flex; flex-direction:column; align-items:center;
gap:2px; padding:0 6px; flex-shrink:0; align-self:center;
}
.dbt-erd-cardinality {
font-size:12px; font-weight:700; color:#2563eb;
font-family:'Courier New',monospace; min-width:22px;
text-align:center;
}
.dbt-erd-line {
height:2px; width:48px; background:#94a3b8;
position:relative; flex-shrink:0;
}
.dbt-erd-rel-diamond {
width:32px; height:32px; background:#eff6ff;
border:2px solid #93c5fd; border-radius:4px;
display:flex; align-items:center; justify-content:center;
font-size:9px; font-weight:700; color:#1d4ed8;
text-align:center; padding:2px; line-height:1.2;
font-family:'DM Sans',sans-serif;
transform:rotate(45deg); flex-shrink:0;
margin:0 4px;
}
.dbt-erd-rel-diamond span { transform:rotate(-45deg); display:block; }
.dbt-erd-weak-entity { border-style: double; border-width:3px; }
.dbt-erd-repr {
font-size:11px; color:#64748b; font-family:'Courier New',monospace;
background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px;
padding:7px 12px; line-height:1.6; word-break:break-word;
}
  </style>`;

  // ── Helpers ───────────────────────────────────────────────────────────
  function escapeHtml(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // ══════════════════════════════════════════════════════════════════════
  // DATA-SET  ← NEW: renders flat row objects as a styled DB table
  // ══════════════════════════════════════════════════════════════════════
  if (type === "data-set") {
    const { representation, values } = data;
    let h = css + `<div class="dw dbt-dataset-wrap">`;
    if (representation) {
      h += `<div class="dbt-dataset-label">${escapeHtml(representation)}</div>`;
    }
    if (!Array.isArray(values) || values.length === 0) {
      h += `<div style="color:#94a3b8;font-size:12px;font-style:italic;">No data rows.</div>`;
      h += `</div>`;
      container.innerHTML = h;
      return;
    }
    // Derive headers from the keys of the first row object
    const headers = Object.keys(values[0]);
    h += `<div style="overflow-x:auto">`;
    h += `<table class="dbt-dataset-table">`;
    h +=
      `<thead><tr>` +
      headers.map((hdr) => `<th>${escapeHtml(hdr)}</th>`).join("") +
      `</tr></thead>`;
    h += `<tbody>`;
    values.forEach((row) => {
      h += `<tr>`;
      headers.forEach((hdr) => {
        const val = row[hdr];
        const isNull = val === null || val === undefined;
        h += `<td class="${isNull ? "null-cell" : ""}">${isNull ? "NULL" : escapeHtml(String(val))}</td>`;
      });
      h += `</tr>`;
    });
    h += `</tbody></table></div></div>`;
    container.innerHTML = h;
    return;
  }

  // ══════════════════════════════════════════════════════════════════════
  // SCHEMA  ← NEW: parses pipe-separated schema string into styled table cards
  // ══════════════════════════════════════════════════════════════════════
  if (type === "schema") {
    const { representation } = data;
    const tables = parseSchemaString(representation);
    let h = css + `<div class="dw">`;
    if (representation) {
      h += `<div class="dbt-erd-repr">${escapeHtml(representation)}</div>`;
      h += `<div style="margin-top:12px;"></div>`;
    }
    if (!tables.length) {
      h += `<div style="color:#94a3b8;font-size:12px;font-style:italic;">Schema data unavailable.</div>`;
      h += `</div>`;
      container.innerHTML = h;
      return;
    }
    h += `<div class="dbt-schema-wrap">`;
    tables.forEach((tbl, ti) => {
      h += `<div class="dbt-schema-table">`;
      h += `<div class="dbt-schema-header">${escapeHtml(tbl.tableName)}</div>`;
      tbl.columns.forEach((col) => {
        h += `<div class="dbt-schema-col">`;
        if (col.tags.includes("PK"))
          h += `<span class="dbt-schema-badge pk">PK</span>`;
        if (col.tags.includes("FK"))
          h += `<span class="dbt-schema-badge fk">FK</span>`;
        if (col.tags.includes("UQ"))
          h += `<span class="dbt-schema-badge uq">UQ</span>`;
        if (col.tags.includes("NN"))
          h += `<span class="dbt-schema-badge nn">NN</span>`;
        h += `<span class="dbt-schema-col-name">${escapeHtml(col.name)}</span>`;
        h += `</div>`;
      });
      h += `</div>`;
      // Arrow connector between tables (not after last)
      if (ti < tables.length - 1) {
        h += `<div class="dbt-schema-arrow">→</div>`;
      }
    });
    h += `</div></div>`;
    container.innerHTML = h;
    return;
  }

  // ══════════════════════════════════════════════════════════════════════
  // ERD  ← NEW: parses the ERD representation string into a visual diagram
  // ══════════════════════════════════════════════════════════════════════
  if (type === "erd") {
    const { representation } = data;
    const { entities, relationships } = parseERDString(representation);
    let h = css + `<div class="dw dbt-erd-wrap">`;

    // Always show the raw notation as a code line for reference
    if (representation) {
      h += `<div class="dbt-erd-repr">${escapeHtml(representation)}</div>`;
    }

    if (!entities.length) {
      h += `<div style="color:#94a3b8;font-size:12px;font-style:italic;">ERD data unavailable.</div>`;
      h += `</div>`;
      container.innerHTML = h;
      return;
    }

    // Build the visual diagram row
    h += `<div class="dbt-erd-diagram">`;
    const rel = relationships[0] || {};

    entities.forEach((ent, ei) => {
      // Entity box
      h += `<div class="dbt-erd-entity">`;
      h += `<div class="dbt-erd-entity-header">${escapeHtml(ent.name)}</div>`;
      ent.cols.forEach((col) => {
        h += `<div class="dbt-erd-entity-col">`;
        if (col.tags.includes("PK"))
          h += `<span class="dbt-erd-badge pk">PK</span>`;
        if (col.tags.includes("FK"))
          h += `<span class="dbt-erd-badge fk">FK</span>`;
        h += `<span>${escapeHtml(col.name)}</span>`;
        h += `</div>`;
      });
      h += `</div>`;

      // Connector between entities
      if (ei < entities.length - 1) {
        const cardLeft =
          ei === 0 ? rel.cardLeft || "" : rel.cardRight || "";
        const cardRight =
          ei === entities.length - 2 ? rel.cardRight || "" : "";
        const relLabel = rel.label
          ? rel.label.replace(/\(.*\)/, "").trim()
          : "";

        h += `<div class="dbt-erd-connector">`;
        h += `<div class="dbt-erd-cardinality" style="margin-bottom:2px">${escapeHtml(cardLeft)}</div>`;
        h += `<div style="display:flex;align-items:center;gap:0">`;
        h += `<div class="dbt-erd-line"></div>`;
        if (relLabel) {
          h += `<div class="dbt-erd-rel-diamond"><span>${escapeHtml(relLabel)}</span></div>`;
        } else {
          h += `<div class="dbt-erd-line" style="background:#2563eb;height:3px;width:20px;"></div>`;
        }
        h += `<div class="dbt-erd-line"></div>`;
        h += `</div>`;
        h += `<div class="dbt-erd-cardinality" style="margin-top:2px">${escapeHtml(cardRight)}</div>`;
        h += `</div>`;
      }
    });
    h += `</div></div>`;
    container.innerHTML = h;
    return;
  }

  // ══════════════════════════════════════════════════════════════════════
  // TABLE  ← updated to handle DBT multi-table format {table, rows:[]}
  // ══════════════════════════════════════════════════════════════════════
  if (type === "table") {
    const { representation, headers, values } = data;

    // ── DBT multi-table format: values is [{table, rows:[{col:val}]}, ...] ──
    if (
      Array.isArray(values) &&
      values.length > 0 &&
      typeof values[0] === "object" &&
      !Array.isArray(values[0]) &&
      values[0].table
    ) {
      let h = css + `<div class="dw">`;
      if (representation) {
        h += `<div class="dbt-erd-repr" style="margin-bottom:12px;">${escapeHtml(representation)}</div>`;
      }
      h += `<div style="display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start;">`;

      values.forEach((tblObj) => {
        const tblName = tblObj.table || "Table";
        const rows = Array.isArray(tblObj.rows) ? tblObj.rows : [];
        const cols = rows.length > 0 ? Object.keys(rows[0]) : [];

        h += `<div style="flex:1;min-width:160px;max-width:340px;">`;
        h += `<div class="dbt-dataset-label">${escapeHtml(tblName)}</div>`;
        h += `<div style="overflow-x:auto">`;
        h += `<table class="dbt-dataset-table">`;
        if (cols.length) {
          h += `<thead><tr>${cols.map((c) => `<th>${escapeHtml(c)}</th>`).join("")}</tr></thead>`;
        }
        h += `<tbody>`;
        rows.forEach((row) => {
          h += `<tr>`;
          cols.forEach((col) => {
            const val = row[col];
            const isNull = val === null || val === undefined;
            h += `<td class="${isNull ? "null-cell" : ""}">${isNull ? "NULL" : escapeHtml(String(val))}</td>`;
          });
          h += `</tr>`;
        });
        h += `</tbody></table></div></div>`;
      });

      h += `</div></div>`;
      container.innerHTML = h;
      return;
    }

    // ── Legacy format: headers[] + values[][] (array-of-arrays) ──────────────
    let h = css + `<div class="dw">`;
    if (representation)
      h += `<div class="dl">${escapeHtml(representation)}</div>`;
    h += `<div style="overflow-x:auto"><table class="dt">`;
    if (headers?.length) {
      h +=
        `<thead><tr>` +
        headers.map((c) => `<th>${escapeHtml(String(c))}</th>`).join("") +
        `</tr></thead>`;
    }
    if (values?.length) {
      h +=
        `<tbody>` +
        values
          .map(
            (row) =>
              `<tr>` +
              row
                .map((cell) => `<td>${escapeHtml(String(cell))}</td>`)
                .join("") +
              `</tr>`,
          )
          .join("") +
        `</tbody>`;
    }
    h += `</table></div></div>`;
    container.innerHTML = h;
    return;
  }

  // ══════════════════════════════════════════════════════════════════════
  // CASE
  // ══════════════════════════════════════════════════════════════════════
  if (type === "case") {
    const { representation, headers, values } = data;
    let h = css + `<div class="dw">`;
    if (representation)
      h += `<div class="dl">${escapeHtml(representation)}</div>`;
    h += `<div style="overflow-x:auto"><table class="dt dc">`;
    if (headers?.length) {
      h +=
        `<thead><tr>` +
        headers.map((c) => `<th>${escapeHtml(String(c))}</th>`).join("") +
        `</tr></thead>`;
    }
    if (values?.length) {
      h +=
        `<tbody>` +
        values
          .map(
            (row) =>
              `<tr>` +
              row
                .map((cell) => `<td>${escapeHtml(String(cell))}</td>`)
                .join("") +
              `</tr>`,
          )
          .join("") +
        `</tbody>`;
    }
    h += `</table></div></div>`;
    container.innerHTML = h;
    return;
  }

  // ══════════════════════════════════════════════════════════════════════
  // CHART  (bar | pie)
  // ══════════════════════════════════════════════════════════════════════
  if (type === "chart") {
    const { representation, chartType, values } = data;
    if (!Array.isArray(values) || !values.length) {
      container.innerHTML = `<div style="color:#ef4444;font-size:13px;">Chart data missing.</div>`;
      return;
    }
    let h = css + `<div class="dw">`;
    if (representation)
      h += `<div class="dl">${escapeHtml(representation)}</div>`;

    if (chartType === "bar") {
      const nums = values.map((v) => Number(v.value) || 0);
      const max = Math.max(...nums) || 1;
      h += values
        .map((v) => {
          const pct = Math.round((Number(v.value) / max) * 100);
          return `<div class="bar-row">
    <div class="bar-lbl">${escapeHtml(String(v.label))}</div>
    <div class="bar-trk">
      <div class="bar-fil" style="width:${pct}%">
        <span class="bar-val">${v.value}</span>
      </div>
    </div>
  </div>`;
        })
        .join("");
    } else if (chartType === "pie") {
      const COLORS = [
        "#2563eb",
        "#0d9488",
        "#f59e0b",
        "#ef4444",
        "#8b5cf6",
        "#ec4899",
        "#10b981",
        "#f97316",
      ];
      const total =
        values.reduce((s, v) => s + (Number(v.percentage) || 0), 0) || 1;
      let angle = -Math.PI / 2;
      const cx = 80,
        cy = 80,
        r = 70;
      let slices = "";
      values.forEach((v, i) => {
        const sweep = (Number(v.percentage) / total) * 2 * Math.PI;
        const ex = cx + r * Math.cos(angle + sweep);
        const ey = cy + r * Math.sin(angle + sweep);
        const x1 = cx + r * Math.cos(angle);
        const y1 = cy + r * Math.sin(angle);
        const large = sweep > Math.PI ? 1 : 0;
        const col = COLORS[i % COLORS.length];
        slices += `<path d="M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${ex},${ey} Z"
              fill="${col}" stroke="#fff" stroke-width="2"/>`;
        angle += sweep;
      });
      const legend = values
        .map(
          (v, i) =>
            `<div class="pie-item">
     <div class="pie-dot" style="background:${COLORS[i % COLORS.length]}"></div>
     <span>${escapeHtml(String(v.label))}: <strong>${v.percentage}%</strong></span>
   </div>`,
        )
        .join("");
      h += `<div class="pie-wrap">
        <svg width="160" height="160" viewBox="0 0 160 160">${slices}</svg>
        <div class="pie-leg">${legend}</div>
      </div>`;
    }
    h += `</div>`;
    container.innerHTML = h;
    return;
  }

  // ══════════════════════════════════════════════════════════════════════
  // NUMBER-GRID
  // ══════════════════════════════════════════════════════════════════════
  if (type === "number-grid") {
    const { representation, grid, rule } = data;
    if (!Array.isArray(grid) || !grid.length) {
      container.innerHTML = `<div style="color:#ef4444;font-size:13px;">Grid data missing.</div>`;
      return;
    }
    let h = css + `<div class="dw">`;
    if (representation)
      h += `<div class="dl">${escapeHtml(representation)}</div>`;
    h += `<table class="ng">`;
    grid.forEach((row) => {
      h += `<tr>`;
      const cells = Array.isArray(row) ? row : Object.values(row);
      cells.forEach((cell) => {
        const isMissing =
          cell === "?" || cell === null || cell === undefined;
        h += `<td class="${isMissing ? "miss" : ""}">${isMissing ? "?" : escapeHtml(String(cell))}</td>`;
      });
      h += `</tr>`;
    });
    h += `</table>`;
    if (rule)
      h += `<div class="ng-rule"><strong style="color:#0f172a">Rule:</strong> ${escapeHtml(rule)}</div>`;
    h += `</div>`;
    container.innerHTML = h;
    return;
  }

  // ══════════════════════════════════════════════════════════════════════
  // ARRANGEMENT  (circular seating / linear)
  // ══════════════════════════════════════════════════════════════════════
  if (type === "arrangement") {
    const {
      representation,
      persons,
      constraints,
      arrangement_clockwise,
    } = data;
    const personList = Array.isArray(persons)
      ? persons.filter((p) => p && p !== "—")
      : [];
    const seatCount =
      personList.length ||
      (Array.isArray(arrangement_clockwise)
        ? arrangement_clockwise.length
        : 0);
    const cleanLabel = (representation || "")
      .replace(/\(left to right\)[^(]*:\s*[A-Z][\w,\s]*$/i, "")
      .replace(/\(clockwise\)[^(]*:\s*[A-Z][\w,\s]*$/i, "")
      .replace(/:\s*[A-Z](,\s*[A-Z])+\s*$/i, "")
      .replace(/\s*[—–-]+\s*$/, "")
      .trim();
    let h = css + `<div class="dw arr-wrap">`;
    if (cleanLabel)
      h += `<div class="dl">${escapeHtml(cleanLabel)}</div>`;
    const rep = (representation || "").toLowerCase();
    const isLinear =
      rep.includes("row") ||
      rep.includes("linear") ||
      rep.includes("straight") ||
      rep.includes("left to right");
    if (!isLinear) {
      const n = seatCount,
        sz = 240,
        cx = sz / 2,
        cy = sz / 2,
        r = 90;
      let svgSeats = "";
      for (let i = 0; i < n; i++) {
        const a = (2 * Math.PI * i) / n - Math.PI / 2;
        const x = Math.round(cx + r * Math.cos(a));
        const y = Math.round(cy + r * Math.sin(a));
        svgSeats += `
    <circle cx="${x}" cy="${y}" r="20" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.5"/>
    <text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle"
          font-size="12" font-weight="600" fill="#64748b"
          font-family="DM Sans, sans-serif">${i + 1}</text>`;
      }
      h += `<svg width="${sz}" height="${sz}" viewBox="0 0 ${sz} ${sz}">
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none"
                stroke="#e2e8f0" stroke-width="1" stroke-dasharray="4 4"/>
        ${svgSeats}
      </svg>`;
      if (personList.length) {
        h += `<div style="font-size:12px;color:#475569;margin-top:4px;">
          Persons: <strong>${personList.join(", ")}</strong>
        </div>`;
      }
    } else {
      const isMultiRow = seatCount > 9;
      const half = Math.ceil(seatCount / 2);
      const renderLinearRow = (fromIdx, count, label) => {
        let row = "";
        for (let i = 0; i < count; i++) {
          const pos = fromIdx + i;
          if (i > 0) {
            row += `<div style="font-size:18px;color:#cbd5e1;align-self:center;
                          padding:0 1px;margin-bottom:16px">—</div>`;
          }
          row += `<div style="display:flex;flex-direction:column;align-items:center;gap:3px">
              <div style="min-width:44px;height:44px;border-radius:8px;
                          background:#f8fafc;border:1.5px dashed #cbd5e1;
                          display:flex;align-items:center;justify-content:center;
                          font-weight:600;font-size:13px;color:#94a3b8;margin:0 2px;">
                ?</div>
              <div style="font-size:9px;color:#94a3b8;font-weight:600">${pos}</div>
            </div>`;
        }
        return `<div style="margin:8px 0">
            ${label ? `<div style="font-size:11px;font-weight:700;color:#64748b;margin-bottom:4px">${label}</div>` : ""}
            <div style="display:flex;gap:0;align-items:flex-end">${row}</div>
          </div>`;
      };
      h += `<div style="font-size:11px;color:#64748b;margin-bottom:4px;">
        ← Left &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Right →
      </div>`;
      if (isMultiRow) {
        h += renderLinearRow(1, half, "Positions 1–" + half);
        h += renderLinearRow(
          half + 1,
          seatCount - half,
          "Positions " + (half + 1) + "–" + seatCount,
        );
      } else {
        h += renderLinearRow(1, seatCount, "");
      }
      if (personList.length) {
        h += `<div style="font-size:12px;color:#475569;margin-top:4px;">
          Persons: <strong>${personList.join(", ")}</strong>
        </div>`;
      }
    }
    if (Array.isArray(constraints) && constraints.length) {
      h +=
        `<div class="arr-con"><strong style="color:#0f172a">Clues:</strong><br>` +
        constraints
          .map((c, i) => `${i + 1}. ${escapeHtml(String(c))}`)
          .join("<br>") +
        `</div>`;
    }
    h += `</div>`;
    container.innerHTML = h;
    return;
  }

  // ══════════════════════════════════════════════════════════════════════
  // MEMORY
  // ══════════════════════════════════════════════════════════════════════
  if (type === "memory") {
    const { representation, values } = data;
    const isTwoCol = values.some(
      (v) =>
        v.includes("   ") ||
        v.startsWith("Stack:") ||
        v.startsWith("Heap:"),
    );
    let h = css + `<div class="dw">`;
    if (representation)
      h += `<div class="dl">${escapeHtml(representation)}</div>`;
    if (isTwoCol) {
      h += `<div class="jd-memory">`;
      h += `<div class="jd-memory-col"><div class="jd-memory-col-header">Stack</div>`;
      values.forEach((line) => {
        if (!line?.trim()) return;
        const isDivider = line.startsWith("---") || line.startsWith("─");
        let stackSide = line;
        if (line.includes("   "))
          stackSide = line.split(/\s{3,}/)[0].trim();
        if (stackSide.startsWith("Stack:"))
          stackSide = stackSide.replace("Stack:", "").trim();
        if (stackSide.startsWith("Heap:")) stackSide = "";
        h += `<div class="jd-memory-row ${isDivider ? "divider" : ""}">
          ${escapeHtml(stackSide || (isDivider ? line.replace(/^-+|─+/g, "").trim() : " "))}
        </div>`;
      });
      h += `</div>`;
      h += `<div class="jd-memory-col"><div class="jd-memory-col-header">Heap</div>`;
      values.forEach((line) => {
        if (!line?.trim()) return;
        const isDivider = line.startsWith("---") || line.startsWith("─");
        let heapSide = "";
        if (line.includes("   ")) {
          const parts = line.split(/\s{3,}/);
          heapSide = parts.slice(1).join("  ").trim();
        }
        if (line.startsWith("Heap:"))
          heapSide = line.replace("Heap:", "").trim();
        h += `<div class="jd-memory-row ${isDivider ? "divider" : ""}">
          ${escapeHtml(heapSide || " ")}
        </div>`;
      });
      h += `</div></div>`;
    } else {
      h += `<div style="border-radius:10px;overflow:hidden;border:1.5px solid #e2e8f0;">
        <div class="jd-memory-col-header">Memory Layout</div>`;
      values.forEach((line) => {
        if (!line?.trim()) {
          h += `<div style="height:8px;background:#f8fafc;border-bottom:1px solid #f1f5f9;"></div>`;
          return;
        }
        const isDivider = line.startsWith("---") || line.startsWith("─");
        h += `<div class="jd-memory-row ${isDivider ? "divider" : ""}">
          ${escapeHtml(line)}
        </div>`;
      });
      h += `</div>`;
    }
    h += `</div>`;
    container.innerHTML = h;
    return;
  }

  // ══════════════════════════════════════════════════════════════════════
  // REFERENCE
  // ══════════════════════════════════════════════════════════════════════
  if (type === "reference") {
    const { representation, values } = data;
    let h = css + `<div class="dw">`;
    if (representation)
      h += `<div class="dl">${escapeHtml(representation)}</div>`;
    h += `<div style="background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:10px;padding:14px 16px;">`;
    values.forEach((line) => {
      if (!line?.trim()) {
        h += `<div class="jd-ref-line blank"></div>`;
        return;
      }
      if (
        line.endsWith(":") ||
        line.match(/^(String Pool|Heap|Variables|Assertions)[:\s]/)
      ) {
        h += `<div class="jd-ref-line section-title">${escapeHtml(line)}</div>`;
        return;
      }
      if (line.includes("→ ?") || line.includes("→?")) {
        h += `<div class="jd-ref-line assertion">${escapeHtml(line)}</div>`;
        return;
      }
      const isPointer =
        line.includes("0x") ||
        line.includes("→") ||
        line.includes("points to");
      h += `<div class="jd-ref-line" style="${isPointer ? "color:#1d4ed8;" : ""}">
        ${escapeHtml(line)}
      </div>`;
    });
    h += `</div></div>`;
    container.innerHTML = h;
    return;
  }

  // ══════════════════════════════════════════════════════════════════════
  // ARRAY
  // ══════════════════════════════════════════════════════════════════════
  if (type === "array") {
    const { representation, values } = data;
    let h = css + `<div class="dw jd-array-wrap">`;
    if (representation)
      h += `<div class="dl">${escapeHtml(representation)}</div>`;
    let sections = [];
    let currentSection = { type: "code", lines: [] };
    values.forEach((line) => {
      if (!line?.trim()) return;
      if (line.startsWith("Index:") || line.startsWith("Value:")) {
        if (currentSection.lines.length) sections.push(currentSection);
        const prevArr = sections[sections.length - 1];
        if (prevArr && prevArr.type === "array-index") {
          sections.push({ type: "array-value", lines: [line] });
        } else {
          sections.push({
            type: line.startsWith("Index:")
              ? "array-index"
              : "array-value",
            lines: [line],
          });
        }
        currentSection = { type: "code", lines: [] };
      } else if (line.startsWith("---")) {
        if (currentSection.lines.length) sections.push(currentSection);
        sections.push({ type: "divider", lines: [line] });
        currentSection = { type: "code", lines: [] };
      } else {
        currentSection.lines.push(line);
      }
    });
    if (currentSection.lines.length) sections.push(currentSection);
    let i = 0;
    while (i < sections.length) {
      const sec = sections[i];
      if (sec.type === "array-index") {
        const nextSec = sections[i + 1];
        const indexLine = sec.lines[0].replace("Index:", "").trim();
        const valueLine =
          nextSec && nextSec.type === "array-value"
            ? nextSec.lines[0].replace("Value:", "").trim()
            : null;
        const indices = indexLine.split(/\s+/).filter(Boolean);
        const vals_arr = valueLine
          ? valueLine.split(/\s+/).filter(Boolean)
          : [];
        h += `<div><div class="jd-array-grid">`;
        indices.forEach((idx, ci) => {
          const val = vals_arr[ci] || "";
          const isUnknown = val === "?";
          h += `<div class="jd-array-cell ${isUnknown ? "unknown" : ""}">
            <div class="jd-array-idx">[${idx}]</div>
            ${escapeHtml(val || "0")}
          </div>`;
        });
        h += `</div></div>`;
        i += valueLine !== null ? 2 : 1;
        continue;
      }
      if (sec.type === "divider") {
        const label = sec.lines[0]
          .replace(/^-+\s*/, "")
          .replace(/\s*-+$/, "")
          .trim();
        if (label)
          h += `<div style="font-size:11px;font-weight:700;color:#64748b;
                               text-transform:uppercase;letter-spacing:0.07em;
                               padding:6px 0 2px;border-top:1px solid #e2e8f0;
                               margin-top:4px;">${escapeHtml(label)}</div>`;
        i++;
        continue;
      }
      if (sec.type === "code" && sec.lines.length) {
        h += `<div class="jd-array-code">${sec.lines.map((l) => escapeHtml(l)).join("\n")}</div>`;
        i++;
        continue;
      }
      i++;
    }
    h += `</div>`;
    container.innerHTML = h;
    return;
  }

  // ══════════════════════════════════════════════════════════════════════
  // CLASS
  // ══════════════════════════════════════════════════════════════════════
  if (type === "class") {
    const { representation, values } = data;
    let h = css + `<div class="dw">`;
    if (representation)
      h += `<div class="dl">${escapeHtml(representation)}</div>`;
    const classes = [];
    let currentClass = null;
    let usageLines = [];
    let inUsage = false;
    values.forEach((line) => {
      if (!line?.trim()) return;
      if (
        line.startsWith("---") ||
        line.toLowerCase().includes("usage")
      ) {
        if (currentClass) {
          classes.push(currentClass);
          currentClass = null;
        }
        inUsage = true;
        return;
      }
      if (inUsage) {
        usageLines.push(line);
        return;
      }
      if (
        !line.startsWith(" ") &&
        !line.startsWith("\t") &&
        !line.startsWith("+")
      ) {
        if (currentClass) classes.push(currentClass);
        const isAbstract =
          line.includes("abstract") || line.includes("(abstract)");
        currentClass = {
          name: line.replace("(abstract)", "").trim(),
          isAbstract,
          methods: [],
        };
      } else if (currentClass && line.trim().startsWith("+")) {
        const tagMatch = line.trim().match(/\[(.*?)\]/);
        const tag = tagMatch ? tagMatch[1] : "";
        currentClass.methods.push({
          text: line
            .trim()
            .replace(/\[.*?\]/, "")
            .trim(),
          tag,
        });
      }
    });
    if (currentClass) classes.push(currentClass);
    h += `<div class="jd-class-grid">`;
    classes.forEach((cls, ci) => {
      const boxType = cls.isAbstract ? "abstract" : "concrete";
      h += `<div class="jd-class-box ${boxType}">
        <div class="jd-class-header">
          <span class="jd-class-tag ${boxType}">${cls.isAbstract ? "abstract" : "class"}</span>
          ${escapeHtml(cls.name)}
        </div>
        <div class="jd-class-body">`;
      cls.methods.forEach((m) => {
        const tagClass = m.tag.includes("abstract")
          ? "abstract"
          : m.tag.includes("override")
            ? "override"
            : "concrete";
        h += `<div class="jd-class-method">
          ${m.tag ? `<span class="jd-class-method-tag ${tagClass}">${escapeHtml(m.tag)}</span>` : ""}
          <span>${escapeHtml(m.text)}</span>
        </div>`;
      });
      h += `</div></div>`;
      if (ci < classes.length - 1)
        h += `<div class="jd-class-arrow">→</div>`;
    });
    h += `</div>`;
    if (usageLines.length) {
      h += `<div style="margin-top:14px;">
        <div class="jd-class-usage-label">Usage</div>
        <div class="jd-class-usage-block">
          ${usageLines.map((l) => escapeHtml(l)).join("\n")}
        </div>
      </div>`;
    }
    h += `</div>`;
    container.innerHTML = h;
    return;
  }

  // ══════════════════════════════════════════════════════════════════════
  // EXECUTION  (try-catch-finally flow)
  // ══════════════════════════════════════════════════════════════════════
  if (type === "execution") {
    const { representation, values } = data;
    let h = css + `<div class="dw"><div class="jd-exec-wrap">`;
    if (representation)
      h =
        css +
        `<div class="dw"><div class="dl">${escapeHtml(representation)}</div><div class="jd-exec-wrap">`;
    values.forEach((line) => {
      if (!line?.trim()) return;
      const trimmed = line.trim();
      if (trimmed === "↓" || trimmed === "→" || trimmed === "↑") {
        h += `<div class="jd-exec-step">
          <div class="jd-exec-dot arrow">↓</div>
          <div class="jd-exec-box arrow-box"></div>
        </div>`;
        return;
      }
      if (trimmed.startsWith("↓") && trimmed.length > 1) {
        const label = trimmed.replace("↓", "").trim();
        h += `<div class="jd-exec-step">
          <div class="jd-exec-dot arrow">↓</div>
          <div class="jd-exec-box arrow-box" style="color:#dc2626;font-weight:600;font-size:11px;">
            ${escapeHtml(label)}
          </div>
        </div>`;
        return;
      }
      if (trimmed === "START") {
        h += `<div class="jd-exec-step">
          <div class="jd-exec-dot start">▶</div>
          <div class="jd-exec-box start-box">START</div>
        </div>`;
        return;
      }
      if (trimmed.startsWith("CONTINUE") || trimmed.startsWith("END")) {
        h += `<div class="jd-exec-step">
          <div class="jd-exec-dot end">■</div>
          <div class="jd-exec-box end-box">${escapeHtml(trimmed)}</div>
        </div>`;
        return;
      }
      const isFinally = trimmed.toLowerCase().includes("finally");
      const isCatch = trimmed.toLowerCase().includes("catch");
      const annotMatch = trimmed.match(/←\s*(.*)/);
      const annot = annotMatch ? annotMatch[1] : null;
      const cleanText = trimmed.replace(/←.*/, "").trim();
      const boxClass = isFinally
        ? "always"
        : isCatch
          ? "catch-box"
          : trimmed.toLowerCase().includes("exception")
            ? "exception"
            : "";
      const dotClass = isFinally ? "special" : "block";
      h += `<div class="jd-exec-step">
        <div class="jd-exec-dot ${dotClass}"></div>
        <div class="jd-exec-box ${boxClass}">${escapeHtml(cleanText)}</div>
        ${annot ? `<div class="jd-exec-annot">← ${escapeHtml(annot)}</div>` : ""}
      </div>`;
    });
    h += `</div></div>`;
    container.innerHTML = h;
    return;
  }

  // ══════════════════════════════════════════════════════════════════════
  // TREE  |  GRAPH  |  STACK  — canvas-based
  // ══════════════════════════════════════════════════════════════════════
  if (type === "tree" || type === "graph" || type === "stack") {
    container.innerHTML = `<canvas id="diagram-canvas"></canvas>`;
    const canvas = container.querySelector("canvas");
    const ctx = canvas.getContext("2d");
    if (type === "tree") {
      canvas.width = 420;
      canvas.height = 300;
      ctx.clearRect(0, 0, 420, 300);
      drawTree(ctx, data);
    } else if (type === "graph") {
      canvas.width = 480;
      canvas.height = 320;
      ctx.clearRect(0, 0, 480, 320);
      drawGraph(ctx, data);
    } else {
      canvas.width = Math.max(
        400,
        (data.elements?.length || 0) * 44 + 20,
      );
      canvas.height = 90;
      ctx.clearRect(0, 0, canvas.width, 90);
      drawStack(ctx, data);
    }
    return;
  }

  // ══════════════════════════════════════════════════════════════════════
  // FALLBACK — raw pre-formatted block for any unknown type
  // ══════════════════════════════════════════════════════════════════════
  let h = css + `<div class="dw">`;
  if (data.representation)
    h += `<div class="dl">${escapeHtml(data.representation)}</div>`;
  const rawLines = (data.values || []).join("\n");
  h += `<pre style="background:#1e293b;color:#e2e8f0;border-radius:8px;padding:14px;
              font-size:12px;line-height:1.6;white-space:pre-wrap;
              word-break:break-word;overflow:hidden;">${escapeHtml(rawLines)}</pre>`;
  h += `</div>`;
  container.innerHTML = h;
}

// ── Draw binary tree ─────────────────────────────────────────
function drawTree(ctx, data) {
  const { nodes, edges } = data;

  // Build a lookup map: id → node
  const nodeMap = {};
  nodes.forEach((n) => (nodeMap[n.id] = n));

  // Draw edges first (lines behind nodes)
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 1.5;
  edges.forEach((e) => {
    const from = nodeMap[e.from];
    const to = nodeMap[e.to];
    if (!from || !to) return;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  });

  // Draw nodes (circles with values)
  nodes.forEach((n) => {
    // Circle background
    ctx.beginPath();
    ctx.arc(n.x, n.y, 18, 0, Math.PI * 2);
    ctx.fillStyle = "#eff6ff";
    ctx.strokeStyle = "#2563eb";
    ctx.lineWidth = 1.5;
    ctx.fill();
    ctx.stroke();

    // Node value text
    ctx.fillStyle = "#1e3a5f";
    ctx.font = "bold 12px DM Sans, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(n.value), n.x, n.y);
  });
}

// ── Draw weighted graph ──────────────────────────────────────
function drawGraph(ctx, data) {
  const { nodes, edges } = data;
  const nodeMap = {};
  nodes.forEach((n) => (nodeMap[n.id] = n));

  // CHANGE: Draw edges first with gray lines and weight labels
  edges.forEach((e) => {
    const from = nodeMap[e.from];
    const to = nodeMap[e.to];
    if (!from || !to) return;

    ctx.strokeStyle = "#94a3b8";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    // Weight label
    if (e.weight !== undefined) {
      const mx = (from.x + to.x) / 2;
      const my = (from.y + to.y) / 2;

      // White circle behind number
      ctx.fillStyle = "#f8fafc";
      ctx.beginPath();
      ctx.arc(mx, my, 10, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#334155";
      ctx.font = "bold 11px DM Sans, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(e.weight), mx, my);
    }
  });

  // CHANGE: Draw nodes — blue fill with white letter (matches CDAC Image 2)
  nodes.forEach((n) => {
    // Shadow
    ctx.shadowColor = "rgba(37, 99, 235, 0.25)";
    ctx.shadowBlur = 8;

    ctx.beginPath();
    ctx.arc(n.x, n.y, 20, 0, Math.PI * 2); // CHANGE: radius 20 (bigger than before)
    ctx.fillStyle = "#2563eb"; // CHANGE: solid blue like CDAC
    ctx.fill();

    ctx.shadowBlur = 0;

    // White border ring
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();

    // White letter
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 13px DM Sans, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(n.id).toUpperCase(), n.x, n.y);
  });

  ctx.shadowBlur = 0;
}

// ── Draw stack ───────────────────────────────────────────────
function drawStack(ctx, data) {
  const { elements, top } = data;
  const boxW = 40;
  const boxH = 36;
  const startX = 10;
  const startY = 20;

  // Draw each element as a box
  elements.forEach((val, i) => {
    const x = startX + i * boxW;
    const isTop = i === top;

    ctx.fillStyle = isTop ? "#eff6ff" : "#f8fafc";
    ctx.strokeStyle = isTop ? "#2563eb" : "#cbd5e1";
    ctx.lineWidth = isTop ? 2 : 1;

    ctx.fillRect(x, startY, boxW, boxH);
    ctx.strokeRect(x, startY, boxW, boxH);

    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 11px DM Sans, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(val), x + boxW / 2, startY + boxH / 2);
  });

  // "Top" arrow and label
  if (top !== undefined && top >= 0) {
    const arrowX = startX + top * boxW + boxW / 2;
    const arrowY = startY + boxH + 6;

    ctx.fillStyle = "#2563eb";
    ctx.font = "bold 10px DM Sans, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("▲ Top", arrowX, arrowY + 10);
  }
}

// ============================================================
// CHANGE: Custom confirm modal logic
// Call showConfirm(message, onOk) instead of confirm()
// ============================================================

function showConfirm(opts) {
  // opts = { title, message, stats, onOk, onCancel }
  const overlay = document.getElementById("confirm-overlay");

  document.getElementById("confirm-title").textContent =
    opts.title || "Submit Exam?";

  document.getElementById("confirm-msg").textContent =
    opts.message || "Are you sure you want to submit?";

  // CHANGE: Build stats chips
  const statsEl = document.getElementById("confirm-stats");
  statsEl.innerHTML = "";
  if (opts.stats) {
    opts.stats.forEach((s) => {
      const chip = document.createElement("div");
      chip.className = `confirm-stat-chip ${s.type}`;
      chip.innerHTML = `
          <div class="confirm-stat-dot" 
               style="background:${
                 s.type === "answered"
                   ? "#16a34a"
                   : s.type === "skipped"
                     ? "#d97706"
                     : "#94a3b8"
               }">
          </div>
          ${s.label}
      `;
      statsEl.appendChild(chip);
    });
  }

  overlay.style.display = "flex";

  // CHANGE: Bind OK button
  const okBtn = document.getElementById("confirm-ok");
  const cancelBtn = document.getElementById("confirm-cancel");

  // Remove old listeners
  const newOk = okBtn.cloneNode(true);
  const newCancel = cancelBtn.cloneNode(true);
  okBtn.parentNode.replaceChild(newOk, okBtn);
  cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);

  document.getElementById("confirm-ok").addEventListener("click", () => {
    overlay.style.display = "none";
    if (opts.onOk) opts.onOk();
  });

  document
    .getElementById("confirm-cancel")
    .addEventListener("click", () => {
      overlay.style.display = "none";
      if (opts.onCancel) opts.onCancel();
    });

  // CHANGE: Close on overlay background click
  overlay.onclick = (e) => {
    if (e.target === overlay) {
      overlay.style.display = "none";
      if (opts.onCancel) opts.onCancel();
    }
  };
}
// ============================================================
// CHANGE: Keyboard shortcut blocking during exam
// Blocks F11, Ctrl+Tab, Alt+Tab, Ctrl+W, F5, Ctrl+R
// Shows a custom warning popup instead
// ============================================================