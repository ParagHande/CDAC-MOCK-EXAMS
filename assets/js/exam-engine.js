// ============================================================
// exam-engine.js — Core exam state & question engine
//
// Responsibilities:
//   • URL param parsing (subject, mock ID)
//   • exam state object (questions, answers, timer, index)
//   • enterFullscreen()
//   • startTimer()
//   • buildNavDots() / refreshDots()
//   • renderQuestion()
//   • isCodeText(), escapeHtml(), getSnippetCode()
//   • selectOption(), clearCurrentAnswer(), navigate(), goToQuestion()
//   • fullscreenHandler(), visibilityHandler(), keydownHandler()
//   • submitExam(), buildResultReview(), filterResult()
//   • loadExam() — fetches JSON and populates exam.questions
//   • DOMContentLoaded → loadExam()
//   • start-btn click → enterFullscreen + startTimer + render
//
// Depends on: app.js (window.MCQApp), exam-ui.js (renderDiagram,
//             openReview, renderResultScreen), exam-guards.js
// ============================================================


// ============================================================
// CHANGE: All exam logic lives here
// ============================================================

const params = new URLSearchParams(window.location.search);
const subjectSlug = params.get("subject");
const mockId = params.get("mock");

// CHANGE: State object tracks everything for this exam session
const exam = {
  questions: [], // All 40 questions loaded from JSON
  userAnswers: [], // Index of selected option per question (null = unanswered)
  currentIndex: 0, // Which question is currently visible
  timerInterval: null,
  secondsLeft: 60 * 60, // 3600 seconds
  submitted: false,
};

const LETTERS = ["A", "B", "C", "D", "E"];

// ── Fullscreen helpers ───────────────────────────────────────

// CHANGE: Enter full-screen on exam start

function enterFullscreen() {
  const el = document.documentElement;
  if (el.requestFullscreen) el.requestFullscreen();
  else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
  else if (el.mozRequestFullScreen) el.mozRequestFullScreen();
  document.getElementById("fullscreen-warning").classList.remove("show");
}

// CHANGE: Listen for full-screen exit and show warning banner
// CHANGE: Use named handlers so they can be removed after submit
document.addEventListener("fullscreenchange", fullscreenHandler);
document.addEventListener("visibilitychange", visibilityHandler);
document.addEventListener("keydown", keydownHandler, true); // true = capture phase blocks F11

// ── Timer ────────────────────────────────────────────────────

function startTimer() {
  exam.timerInterval = setInterval(() => {
    exam.secondsLeft--;

    const m = Math.floor(exam.secondsLeft / 60);
    const s = exam.secondsLeft % 60;
    const display = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    const timerEl = document.getElementById("timer");
    timerEl.textContent = display;

    // CHANGE: Timer turns red/danger when under 5 minutes
    if (exam.secondsLeft <= 300) {
      timerEl.classList.add("danger");
    }

    // CHANGE: Auto-submit when time is up
    if (exam.secondsLeft <= 0) {
      clearInterval(exam.timerInterval);
      submitExam();
    }
  }, 1000);
}

// ── Question navigation dots ─────────────────────────────────

function buildNavDots() {
  const bar = document.getElementById("q-nav-bar");
  bar.innerHTML = "";
  exam.questions.forEach((_, i) => {
    const dot = document.createElement("div");
    dot.className = "q-dot";
    dot.textContent = i + 1;
    dot.id = `dot-${i}`;
    dot.onclick = () => goToQuestion(i);
    bar.appendChild(dot);
  });
  refreshDots();
}

function refreshDots() {
  exam.questions.forEach((_, i) => {
    const dot = document.getElementById(`dot-${i}`);
    if (!dot) return;
    dot.className = "q-dot";
    if (i === exam.currentIndex) {
      dot.classList.add("active");
    } else if (exam.userAnswers[i] !== null) {
      dot.classList.add("answered");
    }
  });
}

// ── Render current question ──────────────────────────────────

function renderQuestion() {
  const q = exam.questions[exam.currentIndex];
  if (!q) return;

  const idx = exam.currentIndex;

  // Update question number
  document.getElementById("q-meta").textContent = `Question #${idx + 1}`;

  // Update question counter in topbar
  document.getElementById("q-counter-text") &&
    (document.getElementById("q-counter-text").textContent =
      `${idx + 1} of ${exam.questions.length}`);

  // CHANGE: Set question text — preserves \n as line breaks
  document.getElementById("q-text").textContent = q.question;

  // CHANGE: Show code snippet if present (snippetLines field)
  const snippetEl = document.getElementById("q-snippet");
  const snippetCode = getSnippetCode(q);
  if (snippetCode.trim()) {
    snippetEl.textContent = snippetCode;
    snippetEl.style.display = "block";
  } else {
    snippetEl.style.display = "none";
  }

  // CHANGE: Draw diagram if present (tree/graph/stack)
  renderDiagram(q);

  // CHANGE: Render option buttons
  const list = document.getElementById("opt-list");
  list.innerHTML = "";

  (q.options || []).forEach((opt, i) => {
    const btn = document.createElement("button");
    btn.className =
      "opt-btn" + (exam.userAnswers[idx] === i ? " selected" : "");

    // CHANGE: Detect if this option contains code (has newline or looks like code)
    const isCodeOption = isCodeText(opt);

    btn.innerHTML = `
      <span class="opt-letter">${LETTERS[i]}</span>
      <span class="opt-text">${
        isCodeOption
          ? `<pre>${escapeHtml(opt)}</pre>` // render as code block
          : escapeHtml(opt) // render as plain text
      }</span>
  `;

    btn.onclick = () => {
      if (exam.submitted) return;
      exam.userAnswers[idx] = i;
      renderQuestion();
    };

    list.appendChild(btn);
  });

  // Update progress count
  const answered = exam.userAnswers.filter((a) => a !== null).length;
  document.getElementById("progress-info").textContent =
    `${answered} / ${exam.questions.length} answered`;

  refreshDots();
  updateRevisitButton();
}

// ============================================================
// CHANGE: Helper — detect if option text looks like code
// Triggers if text has newlines (multi-line code) or starts
// with common code keywords
// ============================================================
// CHANGE: More reliable code detection
// Single-line code options should also be flagged so they
// get the dark pre block (but pre-wrap so they don't scroll)
function isCodeText(text) {
  if (!text) return false;

  // Multi-line = definitely code
  if (text.includes("\n")) return true;

  // Single line — check for code-like patterns
  const codePatterns = [
    /^(int|void|public|private|class|if|while|for|return|temp\s*=|System\.|new\s)/,
    /[{};=].*[{};=]/, // has multiple code symbols
    /\.\w+\(.*\)/, // method calls like temp.next()
    /->/, // pointer arrow
    /\w+\s*=\s*\w+\s*[;,]/, // assignments with semicolon
  ];

  return codePatterns.some((p) => p.test(text.trim()));
}

// CHANGE: Escape HTML so code renders safely inside innerHTML
function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// CHANGE: Same snippet helper as subjects.js so both pages work the same way
function getSnippetCode(item) {
  if (Array.isArray(item.snippetLines))
    return item.snippetLines.join("\n");
  if (item.snippet && Array.isArray(item.snippet.lines))
    return item.snippet.lines.join("\n");
  if (typeof item.snippet === "string") return item.snippet;
  return "";
}

function selectOption(optionIndex) {
  if (exam.submitted) return;
  exam.userAnswers[exam.currentIndex] = optionIndex;
  renderQuestion();
}

function clearCurrentAnswer() {
  exam.userAnswers[exam.currentIndex] = null;
  renderQuestion();
}

function navigate(direction) {
  const next = exam.currentIndex + direction;
  if (next >= 0 && next < exam.questions.length) {
    goToQuestion(next);
  }
}

function goToQuestion(index) {
  exam.currentIndex = index;
  renderQuestion();
}

// ============================================================
// CHANGE: Named handlers so they can be removed after submit
// ============================================================

function fullscreenHandler() {
  if (!document.fullscreenElement && !exam.submitted) {
    document.getElementById("fullscreen-warning").classList.add("show");
  } else {
    document
      .getElementById("fullscreen-warning")
      .classList.remove("show");
  }
}

function visibilityHandler() {
  if (document.hidden && !exam.submitted) {
    showKeyboardWarning(
      "⚠ Switching tabs is not allowed during the exam!",
    );
  }
}

function keydownHandler(e) {
  if (exam.submitted) return;

  // CHANGE: Block F11 (fullscreen toggle) and Ctrl+Tab / Ctrl+W
  const blocked =
    e.key === "F11" ||
    (e.ctrlKey && e.key === "Tab") ||
    (e.ctrlKey && e.key === "t") ||
    (e.ctrlKey && e.key === "w") ||
    (e.altKey && e.key === "Tab");

  if (blocked) {
    e.preventDefault();
    e.stopPropagation();
    showKeyboardWarning(
      e.key === "F11"
        ? "⚠ Pressing F11 is not allowed during the exam!"
        : "⚠ Switching or closing tabs is not allowed during the exam!",
    );
  }
}

// CHANGE: Show a non-blocking keyboard warning popup (auto-dismisses)
function showKeyboardWarning(message) {
  const el = document.getElementById("keyboard-warning");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(window._kwTimer);
  window._kwTimer = setTimeout(() => el.classList.remove("show"), 3000);
}
// ── Submit exam ──────────────────────────────────────────────

// CHANGE: Calculate score and show result screen
// ============================================================
// CHANGE: submitExam — calculates score then builds full review
// ============================================================
// ============================================================
// CHANGE: submitExam() — calculates results, stores per-question
// breakdown, then shows the result screen with wrong answers
// ============================================================
function submitExam() {
  if (exam.submitted) return;
  exam.submitted = true;
  clearInterval(exam.timerInterval);

  // CHANGE: Exit fullscreen cleanly after submit
  if (document.exitFullscreen) document.exitFullscreen();

  // CHANGE: Remove all fullscreen/tab guards after submit
  document.removeEventListener("fullscreenchange", fullscreenHandler);
  document.removeEventListener("visibilitychange", visibilityHandler);
  document.removeEventListener("keydown", keydownHandler);

  let correct = 0,
    wrong = 0,
    skipped = 0;

  // CHANGE: Store detailed result per question for the review screen
  exam.resultDetails = exam.questions.map((q, i) => {
    const sel = exam.userAnswers[i];
    let status;
    if (sel === null) {
      status = "skipped";
      skipped++;
    } else {
      const selText = (q.options[sel] || "").trim().toLowerCase();
      const ans = (q.answer || "").trim().toLowerCase();
      if (selText === ans) {
        status = "correct";
        correct++;
      } else {
        status = "wrong";
        wrong++;
      }
    }
    return {
      question: q.question,
      snippetLines: q.snippetLines || null,
      diagramType: q.diagramType || null,
      diagramData: q.diagramData || null,
      options: q.options,
      correctAnswer: q.answer,
      selectedIndex: sel,
      status, // "correct" | "wrong" | "skipped"
    };
  });

  // Hide exam UI
  document.getElementById("exam-body").style.display = "none";
  document.getElementById("exam-footer").style.display = "none";
  document.getElementById("q-nav-bar").style.display = "none";
  document.getElementById("exam-topbar").style.display = "none";

  // Show result screen
  renderResultScreen(correct, wrong, skipped);
}
// ============================================================
// CHANGE: Build result review list filtered by status
// ============================================================
function buildResultReview(filter) {
  const list = document.getElementById("result-review-list");
  list.innerHTML = "";

  exam.questions.forEach((q, i) => {
    const sel = exam.userAnswers[i];
    const isSkip = sel === null;
    const isCor =
      !isSkip &&
      (q.options[sel] || "").trim().toLowerCase() ===
        (q.answer || "").trim().toLowerCase();
    const isWrong = !isSkip && !isCor;

    // Apply filter
    if (filter === "wrong" && !isWrong) return;
    if (filter === "skipped" && !isSkip) return;
    if (filter === "correct" && !isCor) return;

    const status = isSkip ? "skipped" : isCor ? "correct" : "wrong";
    const badge = isSkip ? "Skipped" : isCor ? "✓ Correct" : "✗ Wrong";

    // Card
    const card = document.createElement("div");
    card.className = `rq-card ${status}`;
    card.dataset.status = status;

    // Header
    const hdr = document.createElement("div");
    hdr.className = `rq-header ${status}`;
    hdr.innerHTML = `
      <div class="rq-num">Question ${i + 1}</div>
      <div class="rq-badge ${status}">${badge}</div>`;
    card.appendChild(hdr);

    // Body
    const body = document.createElement("div");
    body.className = "rq-body";

    // Question text
    const qText = document.createElement("div");
    qText.className = "rq-question";
    qText.textContent = q.question;
    body.appendChild(qText);

    // Code snippet if present
    const snippetCode = getSnippetCode(q);
    if (snippetCode.trim()) {
      const snip = document.createElement("pre");
      snip.className = "rq-snippet";
      snip.textContent = snippetCode;
      body.appendChild(snip);
    }

    // Options
    const optWrap = document.createElement("div");
    optWrap.className = "rq-options";

    (q.options || []).forEach((opt, oi) => {
      const isCorrectOpt =
        opt.trim().toLowerCase() ===
        (q.answer || "").trim().toLowerCase();
      const isSelectedWrong = !isSkip && sel === oi && !isCor;

      const row = document.createElement("div");
      row.className = "rq-opt";
      if (isCorrectOpt) row.classList.add("is-correct");
      if (isSelectedWrong) row.classList.add("is-selected-wrong");

      const optContent = isCodeText(opt)
        ? `<span class="rq-opt-letter">${LETTERS[oi]}</span><pre style="margin:0;background:#1e293b;color:#e2e8f0;border-radius:5px;padding:6px 10px;font-size:11px;white-space:pre-wrap;word-break:break-word;flex:1;">${escapeHtml(opt)}</pre>`
        : `<span class="rq-opt-letter">${LETTERS[oi]}</span><span>${escapeHtml(opt)}</span>`;

      row.innerHTML = optContent;
      optWrap.appendChild(row);
    });
    body.appendChild(optWrap);

    // For wrong/skipped — show a clear "Correct answer" label
    if (isWrong || isSkip) {
      const label = document.createElement("div");
      label.className = "rq-correct-label";
      label.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"
               stroke="#059669" stroke-width="2.5"
               stroke-linecap="round" stroke-linejoin="round">
              <polyline points="2 8 6 12 14 4"/>
          </svg>
          Correct Answer: ${escapeHtml(q.answer || "Not provided")}`;
      body.appendChild(label);
    }

    card.appendChild(body);
    list.appendChild(card);
  });

  // If nothing matches the filter
  if (list.children.length === 0) {
    list.innerHTML = `<div style="text-align:center;color:#94a3b8;padding:32px;font-size:14px;">
      No questions in this category.</div>`;
  }
}

// ============================================================
// CHANGE: Filter buttons in result screen
// ============================================================
function filterResult(type) {
  // Update active button
  ["all", "wrong", "skipped", "correct"].forEach((t) => {
    const btn = document.getElementById(`filter-${t}`);
    if (btn) btn.classList.toggle("active", t === type);
  });
  buildResultReview(type);
}

// ── Load questions and start exam ────────────────────────────

async function loadExam() {
  const app = window.MCQApp;
  const subject = app && app.subjectLookup[subjectSlug];
  const mock = subject && subject.mockTests.find((m) => m.id === mockId);

  if (!subject || !mock) {
    document.getElementById("exam-title").textContent = "Exam not found";
    return;
  }

  document.getElementById("exam-title").textContent =
    `${subject.name} — ${mock.label}`;
  document.getElementById("instr-title").textContent =
    `${subject.name}: ${mock.label}`;

  try {
    const res = await fetch(mock.dataFile);
    const data = await res.json();

    // CHANGE: Shuffle and take only 40 questions for the mock
    let all = Array.isArray(data.questions) ? data.questions : [];
    all = all.sort(() => Math.random() - 0.5);
    exam.questions = all.slice(0, app.MOCK_TOTAL_QUESTIONS);
    exam.userAnswers = new Array(exam.questions.length).fill(null);
  } catch (e) {
    document.getElementById("exam-title").textContent =
      "Failed to load questions";
    console.error(e);
  }
}

// CHANGE: "Start Exam" button — enters full-screen then begins timer
document.getElementById("start-btn").addEventListener("click", () => {
  if (exam.questions.length === 0) {
    alert("Questions still loading, please wait.");
    return;
  }
  document.getElementById("instructions-overlay").classList.add("hidden");
  enterFullscreen();
  buildNavDots();
  renderQuestion();
  startTimer();

  // CHANGE: Register named event handlers (so they can be removed on submit)
  document.addEventListener("fullscreenchange", fullscreenHandler);
  document.addEventListener("visibilitychange", visibilityHandler);
  document.addEventListener("keydown", keydownHandler, true);
});

// Load question data as soon as page loads
document.addEventListener("DOMContentLoaded", () => {
  loadExam();
});

// ============================================================
// CHANGE: Review panel logic
// ============================================================