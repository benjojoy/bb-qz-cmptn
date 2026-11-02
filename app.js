const SPREADSHEET_ID = "1HgFUzf11pVn8W7WK-6PJ_22QnhSXMAEJ6ERz5OuMqVo";

let settings = {};
let questions = [];
let colIndex = { id: 0, book: 1, category: 2, type: 3, question: 4, optA: 5, optB: 6, optC: 7, optD: 8, answer: 9, diff: 10, ref: 11, exp: 12 };
let currentIndex = 0;
let userResponses = [];
let timerInterval = null;
let timeRemaining = 0;

// JSONP fetcher bypassing CORS
function fetchSheetData(sheetName) {
  return new Promise((resolve, reject) => {
    const callbackName = 'gviz_cb_' + Math.random().toString(36).substring(2, 9);
    const script = document.createElement('script');

    window[callbackName] = function(data) {
      delete window[callbackName];
      if (script.parentNode) script.parentNode.removeChild(script);

      if (!data || data.status === 'error') {
        reject(new Error(data?.errors?.[0]?.message || 'GVIZ Error'));
        return;
      }

      let allRows = [];
      if (data.table.cols && data.table.cols.some(c => c.label)) {
        allRows.push(data.table.cols.map(c => c.label || ""));
      }

      (data.table.rows || []).forEach(row => {
        const rowVals = (row.c || []).map(cell => {
          if (!cell) return "";
          if (cell.f !== undefined && cell.f !== null) return String(cell.f).trim();
          if (cell.v !== undefined && cell.v !== null) return String(cell.v).trim();
          return "";
        });
        allRows.push(rowVals);
      });

      resolve(allRows);
    };

    script.onerror = () => {
      delete window[callbackName];
      if (script.parentNode) script.parentNode.removeChild(script);
      reject(new Error('Failed to load sheet: ' + sheetName));
    };

    script.src = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?headers=0&tqx=responseHandler:${callbackName}&sheet=${encodeURIComponent(sheetName)}`;
    document.body.appendChild(script);
  });
}

async function init() {
  try {
    const [settingsRows, rawQuestions] = await Promise.all([
      fetchSheetData("Settings"),
      fetchSheetData("Questions")
    ]);

    // Parse Settings
    settings = {};
    settingsRows.forEach(r => {
      if (!r || r.length === 0) return;
      const keyCell = String(r[0] || "").trim();
      if (!keyCell) return;

      const key = keyCell.replace(/\s+/g, ' ').toLowerCase();

      let val = "";
      for (let i = 1; i < r.length; i++) {
        if (r[i] !== undefined && r[i] !== null && String(r[i]).trim() !== "") {
          val = String(r[i]).trim();
          break;
        }
      }
      settings[key] = val;
    });

    let targetBook = (settings["book filter"] || settings["book"] || "ALL").replace(/\s+/g, " ").trim().toUpperCase();
    let targetCategory = (settings["category filter"] || settings["category"] || "ALL").replace(/\s+/g, " ").trim().toUpperCase();
    let targetDifficulty = (settings["difficulty filter"] || settings["difficulty"] || "ALL").replace(/\s+/g, " ").trim().toUpperCase();

    // Map column headers
    const headerRow = (rawQuestions[0] || []).map(c => String(c || "").trim().toLowerCase());
    const findIdx = (predicate, fallback) => {
      const idx = headerRow.findIndex(predicate);
      return idx !== -1 ? idx : fallback;
    };

    colIndex.id = findIdx(h => h === "id" || h === "sl no", 0);
    colIndex.book = findIdx(h => h.includes("book"), 1);
    colIndex.category = findIdx(h => h.includes("cat"), 2);
    colIndex.type = findIdx(h => h.includes("type"), 3);
    colIndex.question = findIdx(h => h.includes("question"), 4);
    colIndex.optA = findIdx(h => h.includes("opt a") || h.includes("option a") || h === "a", 5);
    colIndex.optB = findIdx(h => h.includes("opt b") || h.includes("option b") || h === "b", 6);
    colIndex.optC = findIdx(h => h.includes("opt c") || h.includes("option c") || h === "c", 7);
    colIndex.optD = findIdx(h => h.includes("opt d") || h.includes("option d") || h === "d", 8);
    colIndex.answer = findIdx(h => h.includes("answer") || h.includes("ans") || h.includes("correct"), 9);
    colIndex.diff = findIdx(h => h.includes("diff"), 10);
    colIndex.ref = findIdx(h => h.includes("ref"), 11);
    colIndex.exp = findIdx(h => h.includes("expl"), 12);

    let pool = rawQuestions.slice(1).filter(r => r && r[colIndex.question] && String(r[colIndex.question]).trim() !== "");

    // Filter by Book
    if (targetBook !== "ALL" && targetBook !== "") {
      pool = pool.filter(r => {
        const val = String(r[colIndex.book] || "").replace(/\s+/g, " ").trim().toUpperCase();
        return val === targetBook;
      });
    }

    // Filter by Category
    if (targetCategory !== "ALL" && targetCategory !== "") {
      pool = pool.filter(r => {
        const val = String(r[colIndex.category] || "").replace(/\s+/g, " ").trim().toUpperCase();
        return val === targetCategory;
      });
    }

    // Filter by Difficulty
    if (targetDifficulty !== "ALL" && targetDifficulty !== "") {
      pool = pool.filter(r => {
        const val = String(r[colIndex.diff] || "").replace(/\s+/g, " ").trim().toUpperCase();
        return val === targetDifficulty;
      });
    }

    if (pool.length === 0) {
      document.getElementById("progressText").innerText = "Total Questions: 0";
      document.getElementById("quizDesc").innerText = `No questions found matching the chosen filters.`;
      document.getElementById("startBtn").disabled = true;
      return;
    }

    // Question Selection
    let selected = [];
    const easyCount = Number(settings["easy count"]) || 0;
    const mediumCount = Number(settings["medium count"]) || 0;
    const hardCount = Number(settings["hard count"]) || 0;
    let targetTotal = Number(settings["number of questions"]) || (easyCount + mediumCount + hardCount);
    if (targetTotal <= 0) targetTotal = pool.length;

    if (targetDifficulty !== "ALL" && targetDifficulty !== "") {
      // Direct pool slice for single difficulty filter
      shuffle(pool);
      selected = pool.slice(0, Math.min(targetTotal, pool.length));
    } else {
      // Mixed distribution across difficulty quotas
      let easy = pool.filter(r => String(r[colIndex.diff] || "").trim().toUpperCase() === "EASY");
      let med = pool.filter(r => String(r[colIndex.diff] || "").trim().toUpperCase() === "MEDIUM");
      let hard = pool.filter(r => String(r[colIndex.diff] || "").trim().toUpperCase() === "HARD");

      shuffle(easy);
      shuffle(med);
      shuffle(hard);

      selected = [
        ...easy.slice(0, easyCount),
        ...med.slice(0, mediumCount),
        ...hard.slice(0, hardCount)
      ];

      targetTotal = Math.min(targetTotal, pool.length);
      if (selected.length < targetTotal) {
        const pickedSet = new Set(selected);
        let remaining = pool.filter(r => !pickedSet.has(r));
        shuffle(remaining);
        selected = selected.concat(remaining.slice(0, targetTotal - selected.length));
      }
    }

    questions = selected;
    if (String(settings["shuffle questions"]).toUpperCase() === "TRUE") {
      shuffle(questions);
    }

    document.getElementById("quizTitle").innerText = settings["quiz title"] || "Bible Quiz";
    document.getElementById("quizDesc").innerText = "Answer all questions.\nEach question carries 1 point.\nNo negative marking.";
    document.getElementById("progressText").innerText = `Total Questions: ${questions.length}`;
    document.getElementById("startBtn").disabled = false;

    if (String(settings["require phone"]).toUpperCase() === "TRUE") {
      document.getElementById("phoneGroup").classList.remove("hidden");
    }
  } catch (err) {
    document.getElementById("quizDesc").innerText = "Error loading quiz data: " + err.message;
    console.error(err);
  }
}

document.getElementById("startBtn").addEventListener("click", () => {
  initAudio();

  const name = document.getElementById("nameInput").value.trim();
  if (!name) return alert("Please enter your name.");

  if (String(settings["require phone"]).toUpperCase() === "TRUE") {
    const phone = document.getElementById("phoneInput").value.trim();
    if (!phone) return alert("Please enter your phone number.");
  }

  document.getElementById("startScreen").classList.add("hidden");
  document.getElementById("quizScreen").classList.remove("hidden");

  const duration = Number(settings["quiz duration minutes"]) || 0;
  if (duration > 0) {
    timeRemaining = duration * 60;
    document.getElementById("timerBadge").classList.remove("hidden");
    updateTimerDisplay();
    timerInterval = setInterval(() => {
      timeRemaining--;
      updateTimerDisplay();
      if (timeRemaining <= 0) {
        clearInterval(timerInterval);
        finishQuiz();
      }
    }, 1000);
  }

  renderQuestion();
});

function updateTimerDisplay() {
  const m = Math.floor(timeRemaining / 60);
  const s = timeRemaining % 60;
  document.getElementById("timeDisplay").innerText = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function renderQuestion() {
  const q = questions[currentIndex];
  const type = String(q[colIndex.type] || "MCQ").trim().toUpperCase();
  const correctRaw = String(q[colIndex.answer] || "").trim().toUpperCase();
  const isMultiple = (type === "CHECKBOX");

  const percent = ((currentIndex) / questions.length) * 100;
  document.getElementById("progressBar").style.width = `${percent}%`;
  document.getElementById("progressText").innerText = `Question ${currentIndex + 1} of ${questions.length}`;
  
  const catLabel = q[colIndex.category] ? ` • ${q[colIndex.category]}` : '';
  document.getElementById("qMeta").innerText = `${q[colIndex.book] || ''}${isMultiple ? ' (Select all that apply)' : ''}`;
  
  const qTitle = document.getElementById("qTitle");
  qTitle.style.animation = 'none';
  qTitle.offsetHeight;
  qTitle.style.animation = 'fadeIn 0.35s ease forwards';
  qTitle.innerText = q[colIndex.question];

  const correctKeys = correctRaw.split(",").map(k => k.trim());

  let options = [];
  if (type === "TF") {
    options = [
      { key: "A", label: "ശരി", correct: correctKeys.includes("A") },
      { key: "B", label: "തെറ്റ്", correct: correctKeys.includes("B") }
    ];
  } else {
    if (q[colIndex.optA]) options.push({ key: "A", label: String(q[colIndex.optA]), correct: correctKeys.includes("A") });
    if (q[colIndex.optB]) options.push({ key: "B", label: String(q[colIndex.optB]), correct: correctKeys.includes("B") });
    if (q[colIndex.optC]) options.push({ key: "C", label: String(q[colIndex.optC]), correct: correctKeys.includes("C") });
    if (q[colIndex.optD]) options.push({ key: "D", label: String(q[colIndex.optD]), correct: correctKeys.includes("D") });
  }

  if (String(settings["shuffle options"]).toUpperCase() === "TRUE") {
    shuffle(options);
  }

  const container = document.getElementById("optionsContainer");
  container.innerHTML = "";

  let selectedSet = new Set();
  document.getElementById("nextBtn").disabled = true;

  // Staggered slow entrance (450ms delay per option)
  options.forEach((opt, idx) => {
    const btn = document.createElement("button");
    btn.className = "option-btn";
    btn.innerText = (isMultiple ? "☐ " : "") + opt.label;

    const delay = idx * 0.45;
    btn.style.animationDelay = `${delay}s`;

    setTimeout(() => {
      playOptionPopSound(idx);
    }, delay * 1000);

    btn.onclick = () => {
      playSelectSound();

      if (isMultiple) {
        if (selectedSet.has(opt)) {
          selectedSet.delete(opt);
          btn.classList.remove("selected");
          btn.innerText = "☐ " + opt.label;
        } else {
          selectedSet.add(opt);
          btn.classList.add("selected");
          btn.innerText = "☑ " + opt.label;
        }

        document.getElementById("nextBtn").disabled = (selectedSet.size === 0);

        const selectedKeys = Array.from(selectedSet).map(o => o.key).sort();
        const targetKeys = [...correctKeys].sort();
        const isAllCorrect = selectedKeys.length === targetKeys.length && selectedKeys.every((v, i) => v === targetKeys[i]);

        userResponses[currentIndex] = {
          question: q[colIndex.question],
          selected: Array.from(selectedSet).map(o => o.label).join(", "),
          isCorrect: isAllCorrect,
          reference: q[colIndex.ref] || "",
          explanation: q[colIndex.exp] || ""
        };
      } else {
        container.querySelectorAll(".option-btn").forEach(b => b.classList.remove("selected"));
        btn.classList.add("selected");
        document.getElementById("nextBtn").disabled = false;

        userResponses[currentIndex] = {
          question: q[colIndex.question],
          selected: opt.label,
          isCorrect: opt.correct,
          reference: q[colIndex.ref] || "",
          explanation: q[colIndex.exp] || ""
        };
      }
    };
    container.appendChild(btn);
  });

  document.getElementById("nextBtn").innerText = (currentIndex === questions.length - 1) ? "Submit Quiz" : "Next Question";
}

document.getElementById("nextBtn").addEventListener("click", () => {
  if (currentIndex < questions.length - 1) {
    playNextQuestionSound();
    currentIndex++;
    renderQuestion();
  } else {
    // Final question submitted -> trigger the celebration sound
    playQuizCompleteSound();
    if (timerInterval) clearInterval(timerInterval);
    finishQuiz();
  }
});

function finishQuiz() {
  document.getElementById("progressBar").style.width = "100%";
  document.getElementById("quizScreen").classList.add("hidden");
  document.getElementById("timerBadge").classList.add("hidden");
  document.getElementById("resultScreen").classList.remove("hidden");

  let score = 0;
  userResponses.forEach(r => { if (r && r.isCorrect) score++; });

  const total = questions.length;
  const percent = total > 0 ? Math.round((score / total) * 100) : 0;

  // 2. Silently record response to your Google Sheet
  const SUBMIT_API_URL = "https://script.google.com/macros/s/AKfycbzIFuKTOW-CC9dhuxRGMXNuVE2L3aRzteu4FAhRBPBt6H0VMWISeUq83fh5LXd26vr3Rw/exec";

  if (SUBMIT_API_URL) {
    fetch(SUBMIT_API_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: document.getElementById("nameInput").value.trim(),
        phone: document.getElementById("phoneInput") ? document.getElementById("phoneInput").value.trim() : "",
        score: score,
        total: total,
        percent: percent
      })
    }).catch(err => console.error("Could not record response:", err));
  }
  
  let congratsHeader = "";
  let excellenceNote = "";
  let badgeColor = "#4f46e5";

  if (percent >= 90) {
    congratsHeader = "🌟 Outstanding Excellence!";
    excellenceNote = "Outstanding knowledge of God's Word! Your dedication and mastery are truly commendable. Keep shining!";
    badgeColor = "#16a34a";
  } else if (percent >= 75) {
    congratsHeader = "🎉 Well Done! Congratulations!";
    excellenceNote = "Great performance! You demonstrated a strong grasp of Scripture. Keep up the good work!";
    badgeColor = "#4f46e5";
  } else if (percent >= 50) {
    congratsHeader = "👍 Good Effort!";
    excellenceNote = "Good attempt! Review the references below to strengthen your understanding and try again.";
    badgeColor = "#d97706";
  } else {
    congratsHeader = "📖 Keep Learning & Growing!";
    excellenceNote = "Every step in studying the Word is valuable. Take time to read through the scripture references below.";
    badgeColor = "#64748b";
  }

  const confirmMsg = settings["confirmation message"] || "Thank you for completing the quiz!";
  
  document.getElementById("participantName").innerHTML = `
    <div style="font-size: 1.25rem; font-weight: 800; color: ${badgeColor}; margin-bottom: 6px;">
      ${congratsHeader}
    </div>
    <p style="font-weight: 700; font-size: 1.05rem; margin-bottom: 4px;">
      ${document.getElementById("nameInput").value.trim()}
    </p>
    <div style="margin: 10px 0 14px 0; padding: 10px 14px; background: #f1f5f9; border-radius: 8px; font-size: 0.95rem; line-height: 1.5; color: #334155;">
      ${excellenceNote}
    </div>
    <p style="white-space: pre-line; color: var(--muted); font-size: 0.9rem; line-height: 1.4; margin-bottom: 12px;">
      ${confirmMsg}
    </p>
  `;

  document.getElementById("scoreValue").innerText = `${score} / ${total}`;
  document.getElementById("scorePercent").innerText = `Accuracy: ${percent}%`;

  const review = document.getElementById("reviewContainer");
  review.innerHTML = "";

  questions.forEach((q, i) => {
    const res = userResponses[i];
    const isCorrect = res ? res.isCorrect : false;
    const userAns = res && res.selected ? res.selected : "Not Answered / രേഖപ്പെടുത്തിയിട്ടില്ല";

    const type = String(q[colIndex.type] || "MCQ").trim().toUpperCase();
    const ansKey = String(q[colIndex.answer] || "").trim().toUpperCase();
    let correctDisplay = "";

    if (type === "TF") {
      correctDisplay = ansKey === "A" ? "ശരി" : "തെറ്റ്";
    } else {
      const keyMap = {
        "A": q[colIndex.optA],
        "B": q[colIndex.optB],
        "C": q[colIndex.optC],
        "D": q[colIndex.optD]
      };
      correctDisplay = ansKey.split(",").map(k => keyMap[k.trim()] || k.trim()).join(", ");
    }

    const ref = (res && res.reference) ? res.reference : (q[colIndex.ref] || q[11] || "");
    const exp = (res && res.explanation) ? res.explanation : (q[colIndex.exp] || q[12] || "");

    const div = document.createElement("div");
    div.className = `review-item ${isCorrect ? 'pass' : 'fail'}`;
    div.innerHTML = `
      <div style="font-weight:700; margin-bottom: 6px; font-size: 1rem;">${i + 1}. ${q[colIndex.question]}</div>
      <div style="font-size:0.95rem; margin-bottom: 4px;">
        Your Answer: <strong>${userAns}</strong> ${isCorrect ? '✅' : '❌'}
      </div>
      ${!isCorrect ? `
        <div style="font-size:0.95rem; color: var(--correct); font-weight: 600; margin-bottom: 6px;">
          Correct Answer: ${correctDisplay}
        </div>
      ` : ''}
      ${(ref || exp) ? `
        <div class="feedback-box">
          ${ref ? `<div style="font-weight: 600; color: #4338ca;">📖 <strong>Reference:</strong> ${ref}</div>` : ''}
          ${exp ? `<div style="margin-top: 4px;">💡 <strong>Explanation:</strong> ${exp}</div>` : ''}
        </div>
      ` : ''}
    `;
    review.appendChild(div);
  });
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Retake Quiz Handler
const retakeBtn = document.getElementById("retakeBtn");
if (retakeBtn) {
  retakeBtn.addEventListener("click", () => {
    // 1. Reset state counters
    currentIndex = 0;
    userResponses = [];
    timeRemaining = 0;
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }

    // 2. Clear out review items
    document.getElementById("reviewContainer").innerHTML = "";

    // 3. Reset progress bar
    document.getElementById("progressBar").style.width = "0%";

    // 4. Re-shuffle questions for a fresh attempt
    if (String(settings["shuffle questions"]).toUpperCase() === "TRUE") {
      shuffle(questions);
    }

    // 5. Hide results screen & show start screen
    document.getElementById("resultScreen").classList.add("hidden");
    document.getElementById("startScreen").classList.remove("hidden");
    document.getElementById("startBtn").disabled = false;
    document.getElementById("progressText").innerText = `Total Questions: ${questions.length}`;

    // 6. Scroll smoothly back to top
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}

init();
