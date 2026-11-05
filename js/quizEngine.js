let currentIndex = 0;
let userResponses = [];
let timerInterval = null;
let timeRemaining = 0;

function startQuizEngine() {
  currentIndex = 0;
  userResponses = [];
  timeRemaining = 0;

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
        submitQuizFinal();
      }
    }, 1000);
  }

  renderQuestion();
}

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
  
  const qProgressLabel = currentLang === "en" 
    ? `Qstn ${currentIndex + 1} / ${questions.length}` 
    : `ചോദ്യം ${currentIndex + 1} / ${questions.length}`;
  document.getElementById("progressText").innerText = qProgressLabel;
  
  const multiLabel = currentLang === "en" ? " (Select all that apply)" : " (ശരിയായവയെല്ലാം തിരഞ്ഞെടുക്കുക)";
  document.getElementById("qMeta").innerText = `${q[colIndex.book] || ''}${isMultiple ? multiLabel : ''}`;
  
  const qTitle = document.getElementById("qTitle");
  qTitle.style.animation = 'none';
  qTitle.offsetHeight;
  qTitle.style.animation = 'fadeIn 0.35s ease forwards';
  
  qTitle.innerText = getLocalizedText(q, colIndex.question, colIndex.question_en);

  const correctKeys = correctRaw.split(",").map(k => k.trim());

  let options = [];
  if (type === "TF") {
    options = [
      { key: "A", label: currentLang === "en" ? "True" : "ശരി", correct: correctKeys.includes("A") },
      { key: "B", label: currentLang === "en" ? "False" : "തെറ്റ്", correct: correctKeys.includes("B") }
    ];
  } else {
    const textA = getLocalizedText(q, colIndex.optA, colIndex.optA_en);
    const textB = getLocalizedText(q, colIndex.optB, colIndex.optB_en);
    const textC = getLocalizedText(q, colIndex.optC, colIndex.optC_en);
    const textD = getLocalizedText(q, colIndex.optD, colIndex.optD_en);

    if (textA) options.push({ key: "A", label: textA, correct: correctKeys.includes("A") });
    if (textB) options.push({ key: "B", label: textB, correct: correctKeys.includes("B") });
    if (textC) options.push({ key: "C", label: textC, correct: correctKeys.includes("C") });
    if (textD) options.push({ key: "D", label: textD, correct: correctKeys.includes("D") });
  }

  if (String(settings["shuffle options"]).toUpperCase() === "TRUE") {
    shuffle(options);
  }

  const container = document.getElementById("optionsContainer");
  container.innerHTML = "";

  let selectedSet = new Set();
  document.getElementById("nextBtn").disabled = true;

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

function handleNextOrSubmit() {
  if (currentIndex < questions.length - 1) {
    playNextQuestionSound();
    currentIndex++;
    renderQuestion();
  } else {
    submitQuizFinal();
  }
}

function submitQuizFinal() {
  playQuizCompleteSound();
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  showQuizResults(questions, userResponses, settings, colIndex);
}

function retakeQuizAction() {
  currentIndex = 0;
  userResponses = [];
  timeRemaining = 0;
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  const header = document.querySelector(".header");
  if (header) header.classList.remove("hidden");
  document.getElementById("reviewContainer").innerHTML = "";
  document.getElementById("progressBar").style.width = "0%";

  if (String(settings["shuffle questions"]).toUpperCase() === "TRUE") {
    shuffle(questions);
  }

  const adminBtn = document.getElementById("adminBtn");
  if (adminBtn) {
    adminBtn.classList.remove("hidden");
  }

  document.getElementById("resultScreen").classList.add("hidden");
  document.getElementById("startScreen").classList.remove("hidden");
  document.getElementById("startBtn").disabled = false;
  document.getElementById("progressText").innerText = `Total Questions: ${questions.length}`;
  // When explicitly clicking Retake:
  sessionStorage.removeItem("quiz_review_active");
  sessionStorage.removeItem("quiz_cached_responses");

// Re-sync the question count label based on whatever chapters remain checked
  const checkedBoxes = Array.from(document.querySelectorAll('input[name="userSelectedChapter"]:checked'));
  const catCol = (colIndex && colIndex.category !== undefined) ? colIndex.category : 2;
  const activeChaps = checkedBoxes.map(cb => cb.value.toLowerCase());
  const pool = window.allRawQuestions || questions || [];
  const matched = pool.filter(q => activeChaps.includes(String(q[catCol] || "").trim().toLowerCase()));
  
  window.scrollTo({ top: 0, behavior: "smooth" });
}
