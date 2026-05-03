// ============================================================
// exam-guards.js — Keyboard blocking, key-warning popup,
//                  result screen builder
//
// Responsibilities:
//   • showKeyWarning() / closeKeyWarning()
//   • document.addEventListener("keydown", ...) — blocks F11,
//     Ctrl+Tab, Ctrl+W, F5/Ctrl+R, Alt+Tab, Ctrl+Shift+I/F12
//   • renderResultScreen() — builds the SVG score ring +
//     stat cards + filter tabs + breakdown list
//   • buildBreakdownHTML() — per-question review cards
//   • filterResults() — filter-tab click handler
//
// Depends on: exam-engine.js (exam object, LETTERS, escapeHtml,
//             enterFullscreen), exam-ui.js (renderDiagram)
// ============================================================

function showKeyWarning(message) {
  document.getElementById("key-warn-msg").textContent = message;
  document.getElementById("key-warning-overlay").classList.add("show");
}

function closeKeyWarning() {
  document.getElementById("key-warning-overlay").classList.remove("show");
  // Re-enter fullscreen if they exited via F11
  if (!document.fullscreenElement && !exam.submitted) {
    enterFullscreen();
  }
}

// CHANGE: Block keyboard shortcuts during active exam
document.addEventListener("keydown", (e) => {
  // Allow all keys AFTER exam is submitted
  if (exam.submitted) return;

  // F11 — fullscreen toggle
  if (e.key === "F11") {
    e.preventDefault();
    showKeyWarning(
      "Pressing F11 to exit full-screen is not allowed during the exam.",
    );
    return;
  }

  // Ctrl+Tab — tab switching
  if (e.ctrlKey && e.key === "Tab") {
    e.preventDefault();
    showKeyWarning(
      "Switching tabs using Ctrl+Tab is not allowed during the exam.",
    );
    return;
  }

  // Ctrl+W — close tab
  if (e.ctrlKey && e.key === "w") {
    e.preventDefault();
    showKeyWarning("Closing the tab is not allowed during the exam.");
    return;
  }

  // F5 / Ctrl+R — page refresh
  if (e.key === "F5" || (e.ctrlKey && e.key === "r")) {
    e.preventDefault();
    showKeyWarning("Refreshing the page during the exam is not allowed.");
    return;
  }

  // Alt+Tab — can't fully block (OS-level), but show warning on Alt key
  if (e.altKey && e.key === "Tab") {
    showKeyWarning(
      "Switching windows using Alt+Tab is not allowed during the exam.",
    );
    return;
  }

  // Ctrl+Shift+I / F12 — DevTools
  if ((e.ctrlKey && e.shiftKey && e.key === "I") || e.key === "F12") {
    e.preventDefault();
    showKeyWarning(
      "Opening developer tools is not allowed during the exam.",
    );
    return;
  }
});
// ============================================================
// CHANGE: Full result screen — score summary + per-question
// breakdown showing wrong answers and correct answers
// ============================================================
function renderResultScreen(correct, wrong, skipped) {
  const total = exam.questions.length;
  const pct = Math.round((correct / total) * 100);
  const screen = document.getElementById("result-screen");

  screen.innerHTML = `

  <!-- TOP BUTTON -->
  <button class="go-home-btn" onclick="window.location.href='index.html'" style="margin-bottom:16px;">
← Back to Home
  </button>

  <!-- Score card -->
  <div class="res-card">
<div class="res-score-ring">
    <svg viewBox="0 0 120 120" width="140" height="140">
        <circle cx="60" cy="60" r="52" fill="none"
                stroke="#e2e8f0" stroke-width="10"/>
        <circle cx="60" cy="60" r="52" fill="none"
                stroke="${pct >= 60 ? "#10b981" : pct >= 40 ? "#f59e0b" : "#ef4444"}"
                stroke-width="10"
                stroke-dasharray="${2 * Math.PI * 52}"
                stroke-dashoffset="${2 * Math.PI * 52 * (1 - pct / 100)}"
                stroke-linecap="round"
                transform="rotate(-90 60 60)"/>
        <text x="60" y="55" text-anchor="middle"
              font-family="Space Grotesk,sans-serif"
              font-size="22" font-weight="700"
              fill="#0f172a">${pct}%</text>
        <text x="60" y="74" text-anchor="middle"
              font-family="DM Sans,sans-serif"
              font-size="11" fill="#64748b">Score</text>
    </svg>
</div>

<div class="res-stat-row">
    <div class="res-stat correct">
        <div class="res-stat-val">${correct}</div>
        <div class="res-stat-lbl">✓ Correct</div>
    </div>
    <div class="res-stat wrong">
        <div class="res-stat-val">${wrong}</div>
        <div class="res-stat-lbl">✗ Wrong</div>
    </div>
    <div class="res-stat skipped">
        <div class="res-stat-val">${skipped}</div>
        <div class="res-stat-lbl">— Skipped</div>
    </div>
    <div class="res-stat total-stat">
        <div class="res-stat-val">${total}</div>
        <div class="res-stat-lbl">Total</div>
    </div>
</div>

<div class="res-verdict ${pct >= 60 ? "pass" : "fail"}">
    ${pct >= 60 ? "🎉 Well done! You passed." : "📚 Keep practising. You can do better!"}
</div>
  </div>

  <!-- Filter tabs -->
  <div class="res-filter-row">
<button class="res-filter-btn active" onclick="filterResults('all',this)">
    All (${total})
</button>
<button class="res-filter-btn" onclick="filterResults('wrong',this)">
    Wrong (${wrong})
</button>
<button class="res-filter-btn" onclick="filterResults('correct',this)">
    Correct (${correct})
</button>
<button class="res-filter-btn" onclick="filterResults('skipped',this)">
    Skipped (${skipped})
</button>
  </div>

  <!-- Breakdown -->
  <div class="res-breakdown" id="res-breakdown">
${buildBreakdownHTML("all")}
  </div>

  <!-- BOTTOM BUTTON -->
  <button class="go-home-btn" onclick="window.location.href='index.html'" style="margin-top:16px;">
← Back to Home
  </button>
  `;

  // 🔥 Make visible
  screen.classList.add("show");
}

// ============================================================
// CHANGE: Build the HTML for the question breakdown list
// filtered by: 'all' | 'correct' | 'wrong' | 'skipped'
// ============================================================
function buildBreakdownHTML(filter) {
  return exam.resultDetails
    .map((r, i) => {
      if (filter !== "all" && r.status !== filter) return "";

      const selectedText =
        r.selectedIndex !== null ? r.options[r.selectedIndex] : null;

      const statusIcon =
        r.status === "correct" ? "✓" : r.status === "wrong" ? "✗" : "—";
      const statusClass = r.status; // correct | wrong | skipped

      // Build options HTML
      const optionsHTML = r.options
        .map((opt, oi) => {
          let cls = "rq-option";
          if (
            opt.trim().toLowerCase() ===
            r.correctAnswer.trim().toLowerCase()
          )
            cls += " rq-correct";
          if (
            r.selectedIndex === oi &&
            opt.trim().toLowerCase() !==
              r.correctAnswer.trim().toLowerCase()
          )
            cls += " rq-selected-wrong";
          return `<div class="${cls}">${LETTERS[oi]}. ${escapeHtml(opt)}</div>`;
        })
        .join("");

      // Snippet if present
      const snippetHTML = r.snippetLines
        ? `<pre class="rq-snippet">${escapeHtml(r.snippetLines.join("\n"))}</pre>`
        : "";

      // Correct answer note
      const answerNote =
        r.status !== "correct"
          ? `<div class="rq-answer-note">
             <span class="rq-ans-label">Correct answer:</span>
             <span class="rq-ans-text">${escapeHtml(r.correctAnswer)}</span>
         </div>`
          : "";

      // Your answer note
      const yourNote =
        r.status === "wrong"
          ? `<div class="rq-your-note">
             <span class="rq-your-label">Your answer:</span>
             <span class="rq-your-text">${escapeHtml(selectedText || "—")}</span>
         </div>`
          : "";

      return `
  <div class="rq-card ${statusClass}">
      <div class="rq-head">
          <span class="rq-num">Q${i + 1}</span>
          <span class="rq-status-badge ${statusClass}">${statusIcon} ${r.status}</span>
      </div>
      <div class="rq-qtext">${escapeHtml(r.question)}</div>
      ${snippetHTML}
      <div class="rq-options">${optionsHTML}</div>
      ${answerNote}
      ${yourNote}
  </div>`;
    })
    .join("");
}

// CHANGE: Filter button handler
function filterResults(filter, btn) {
  document
    .querySelectorAll(".res-filter-btn")
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  document.getElementById("res-breakdown").innerHTML =
    buildBreakdownHTML(filter);
}