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
  document.getElementById("progressText").innerText = `Question ${currentIndex + 1} of ${questions.length}`;
  
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

  document.getElementById("reviewContainer").innerHTML = "";
  document.getElementById("progressBar").style.width = "0%";

  if (String(settings["shuffle questions"]).toUpperCase() === "TRUE") {
    shuffle(questions);
  }

  document.getElementById("resultScreen").classList.add("hidden");
  document.getElementById("startScreen").classList.remove("hidden");
  document.getElementById("startBtn").disabled = false;
  document.getElementById("progressText").innerText = `Total Questions: ${questions.length}`;

  window.scrollTo({ top: 0, behavior: "smooth" });
}
