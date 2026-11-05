// Global references accessible by quizEngine.js and admin.js
window.allRawQuestions = [];

async function initApp() {
  try {
    const data = await loadQuizData();
    settings = data.settings;
    questions = data.questions;
    
    // Crucial: assign both local and window pool so chapter generator gets questions
    window.allRawQuestions = [...questions];

    document.getElementById("quizTitle").innerText = settings["quiz title"] || "Bible Quiz";
    document.getElementById("quizDesc").innerText = "Answer all questions.\nEach question carries 1 point.\nNo negative marking.";
    document.getElementById("startBtn").disabled = false;

    const isPhoneRequired = String(settings["require phone"]).toUpperCase() === "TRUE";
    const phoneLabel = document.getElementById("phoneLabel");
    if (phoneLabel) {
      phoneLabel.innerText = isPhoneRequired ? "WhatsApp Number *" : "WhatsApp Number (Optional)";
    }

    // Build the dynamic multi-select chapter checkboxes with the populated pool
    setupUserChapterMultiSelect(window.allRawQuestions);

  } catch (err) {
    document.getElementById("quizDesc").innerText = "Error loading quiz data: " + err.message;
    console.error(err);
  }
}

// -------------------------------------------------------------
// Dynamic Multi-Select Chapter Generator
// -------------------------------------------------------------
function setupUserChapterMultiSelect(questionList) {
  const container = document.getElementById("userChapterCheckboxContainer");
  const selectAllCb = document.getElementById("userSelectAllChapters");
  const badge = document.getElementById("selectedChapBadge");
  const errorMsg = document.getElementById("chapSelectError");
  if (!container) return;

  // Category is Column C (index 2)
  const catCol = (typeof colIndex !== "undefined" && colIndex.category !== undefined) ? colIndex.category : 2;

  // Extract distinct chapters
  const chapterSet = new Set();
  (questionList || []).forEach(q => {
    const chap = String(q[catCol] || q[2] || "").trim();
    if (chap) chapterSet.add(chap);
  });

  const sortedChapters = Array.from(chapterSet).sort((a, b) => {
    const numA = parseInt(a.replace(/[^0-9]/g, "")) || 0;
    const numB = parseInt(b.replace(/[^0-9]/g, "")) || 0;
    return numA - numB;
  });

  container.innerHTML = "";
  sortedChapters.forEach(chap => {
    const label = document.createElement("label");
    label.style.cssText = "display:flex; align-items:center; gap:6px; font-size:0.85rem; padding:4px 6px; background:#fff; border:1px solid #e2e8f0; border-radius:6px; cursor:pointer;";
    label.innerHTML = `
      <input type="checkbox" name="userSelectedChapter" value="${chap}" checked style="width:15px; height:15px; accent-color:#4f46e5;">
      <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-weight:600; color:#1e293b;">${chap}</span>
    `;
    container.appendChild(label);
  });

  const checkboxes = container.querySelectorAll('input[name="userSelectedChapter"]');

  function syncChapterSelection() {
    const checked = Array.from(checkboxes).filter(cb => cb.checked);
    const count = checked.length;

    if (errorMsg) errorMsg.style.display = count === 0 ? "block" : "none";

    if (count === checkboxes.length) {
      selectAllCb.checked = true;
      selectAllCb.indeterminate = false;
      if (badge) badge.innerText = "All Selected";
    } else if (count === 0) {
      selectAllCb.checked = false;
      selectAllCb.indeterminate = false;
      if (badge) badge.innerText = "0 Selected";
    } else {
      selectAllCb.checked = false;
      selectAllCb.indeterminate = true;
      if (badge) badge.innerText = `${count} Selected`;
    }

    const activeChaps = checked.map(cb => cb.value.toLowerCase());
    const matched = (window.allRawQuestions || []).filter(q => {
      const chap = String(q[catCol] || q[2] || "").trim().toLowerCase();
      return activeChaps.includes(chap);
    });

    const progressEl = document.getElementById("progressText");
    if (progressEl) progressEl.innerText = `Total Questions: ${matched.length}`;
  }

  if (selectAllCb) {
    selectAllCb.onchange = () => {
      checkboxes.forEach(cb => { cb.checked = selectAllCb.checked; });
      syncChapterSelection();
    };
  }

  checkboxes.forEach(cb => {
    cb.onchange = syncChapterSelection;
  });

  syncChapterSelection();
}

// -------------------------------------------------------------
// Validation & Quiz Start
// -------------------------------------------------------------
function validateName(name) {
  return /^[A-Za-z\u0D00-\u0D7F\s.]{3,50}$/.test(name.trim());
}

function validatePhone(phone) {
  const cleaned = phone.replace(/[\s\-\(\)\+]/g, "").replace(/^91/, "");
  return /^[6-9]\d{9}$/.test(cleaned);
}

document.getElementById("startBtn").addEventListener("click", () => {
  if (typeof initAudio === "function") initAudio();

  const nameInput = document.getElementById("nameInput");
  const phoneInput = document.getElementById("phoneInput");
  const nameError = document.getElementById("nameError");
  const phoneError = document.getElementById("phoneError");
  const chapSelectError = document.getElementById("chapSelectError");

  const nameVal = nameInput.value.trim();
  const phoneVal = phoneInput.value.trim();
  const isPhoneRequired = String(settings["require phone"]).toUpperCase() === "TRUE";

  let hasError = false;

  // Name check
  if (!nameVal || !validateName(nameVal)) {
    nameError.style.display = "block";
    nameInput.style.borderColor = "#ef4444";
    nameInput.focus();
    hasError = true;
  } else {
    nameError.style.display = "none";
    nameInput.style.borderColor = "";
  }

  // Phone check
  if (isPhoneRequired || phoneVal.length > 0) {
    if (!validatePhone(phoneVal)) {
      phoneError.style.display = "block";
      phoneInput.style.borderColor = "#ef4444";
      if (!hasError) phoneInput.focus();
      hasError = true;
    } else {
      phoneError.style.display = "none";
      phoneInput.style.borderColor = "";
    }
  }

  // Chapter selection check
  const checkedBoxes = Array.from(document.querySelectorAll('input[name="userSelectedChapter"]:checked'));
  if (checkedBoxes.length === 0) {
    if (chapSelectError) chapSelectError.style.display = "block";
    showToast("Please select at least one chapter!", "error");
    hasError = true;
  } else {
    if (chapSelectError) chapSelectError.style.display = "none";
  }

  if (hasError) return;

  // Filter questions by user selection
  const selectedChapters = checkedBoxes.map(cb => cb.value.toLowerCase());
  const catCol = (typeof colIndex !== "undefined" && colIndex.category !== undefined) ? colIndex.category : 2;

  let filteredPool = (window.allRawQuestions || []).filter(q => {
    const chap = String(q[catCol] || q[2] || "").trim().toLowerCase();
    return selectedChapters.includes(chap);
  });

  if (String(settings["shuffle questions"]).toUpperCase() === "TRUE") {
    shuffle(filteredPool);
  }

  const maxLimit = Number(settings["number of questions"]) || 0;
  if (maxLimit > 0 && filteredPool.length > maxLimit) {
    filteredPool = filteredPool.slice(0, maxLimit);
  }

  questions = filteredPool;

  const langDropdown = document.getElementById("langSelect");
  if (langDropdown) {
    currentLang = langDropdown.value;
    localStorage.setItem("quiz_lang", currentLang);
  }

  const adminBtn = document.getElementById("adminBtn");
  if (adminBtn) adminBtn.classList.add("hidden");

  document.getElementById("startScreen").classList.add("hidden");
  document.getElementById("quizScreen").classList.remove("hidden");

  startQuizEngine();
});

// Navigation & Actions
document.getElementById("nextBtn").addEventListener("click", handleNextOrSubmit);

const retakeBtn = document.getElementById("retakeBtn");
if (retakeBtn) retakeBtn.addEventListener("click", retakeQuizAction);

const refreshBtn = document.getElementById("refreshBtn");
if (refreshBtn) refreshBtn.addEventListener("click", () => window.location.reload());

// PDF Download
const downloadPdfBtn = document.getElementById("downloadPdfBtn");
if (downloadPdfBtn) {
  downloadPdfBtn.addEventListener("click", () => {
    const element = document.getElementById("resultScreen");
    const name = document.getElementById("nameInput").value.trim() || "Participant";
    const buttons = element.querySelectorAll("button");
    buttons.forEach(b => b.style.display = "none");

    const opt = {
      margin: 10,
      filename: `Bible_Quiz_Review_${name.replace(/\s+/g, '_')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    html2pdf().set(opt).from(element).save().then(() => {
      buttons.forEach(b => b.style.display = "");
    });
  });
}

// WhatsApp Share
const shareWhatsAppBtn = document.getElementById("shareWhatsAppBtn");
if (shareWhatsAppBtn) {
  shareWhatsAppBtn.addEventListener("click", () => {
    const name = document.getElementById("nameInput").value.trim();
    const phone = document.getElementById("phoneInput").value.replace(/[^0-9]/g, "");
    const scoreText = document.getElementById("scoreValue").innerText;
    const percentText = document.getElementById("scorePercent").innerText;
    const quizTitle = document.getElementById("quizTitle").innerText;

    let msg = `📖 *${quizTitle} Result*\n\n` +
              `👤 *Participant:* ${name}\n` +
              `🎯 *Score:* ${scoreText} (${percentText})\n\n` +
              `*Review Answers:*\n\n`;

    questions.forEach((q, i) => {
      const res = userResponses[i];
      const isCorrect = res ? res.isCorrect : false;
      const notAnsweredText = currentLang === "en" ? "Not Answered" : "രേഖപ്പെടുത്തിയിട്ടില്ല";
      const userAns = res && res.selected ? res.selected : notAnsweredText;

      const type = String(q[colIndex.type] || "MCQ").trim().toUpperCase();
      const ansKey = String(q[colIndex.answer] || "").trim().toUpperCase();
      let correctDisplay = "";

      if (type === "TF") {
        correctDisplay = currentLang === "en" ? (ansKey === "A" ? "True" : "False") : (ansKey === "A" ? "ശരി" : "തെറ്റ്");
      } else {
        const keyMap = {
          "A": getLocalizedText(q, colIndex.optA, colIndex.optA_en),
          "B": getLocalizedText(q, colIndex.optB, colIndex.optB_en),
          "C": getLocalizedText(q, colIndex.optC, colIndex.optC_en),
          "D": getLocalizedText(q, colIndex.optD, colIndex.optD_en)
        };
        correctDisplay = ansKey.split(",").map(k => keyMap[k.trim()] || k.trim()).join(", ");
      }

      const qText = getLocalizedText(q, colIndex.question, colIndex.question_en);
      const ref = (res && res.reference) ? res.reference : (q[colIndex.ref] || "");
      const exp = getLocalizedText(q, colIndex.exp, colIndex.exp_en);

      msg += `${i + 1}. ${qText}\nYour Answer: ${userAns} ${isCorrect ? '✅' : '❌'}\n`;
      if (!isCorrect) msg += `Correct Answer: ${correctDisplay}\n`;
      if (ref) msg += `📖 Reference: ${ref}\n`;
      if (exp) msg += `💡 Explanation: ${exp}\n`;
      msg += `\n`;
    });

    const encodedMsg = encodeURIComponent(msg.trim());
    const targetPhone = phone.length === 10 ? `91${phone}` : phone;
    const url = targetPhone ? `https://api.whatsapp.com/send?phone=${targetPhone}&text=${encodedMsg}` : `https://api.whatsapp.com/send?text=${encodedMsg}`;
    window.open(url, "_blank");
  });
}

// Appearance & Utility Handlers
const themeToggleBtn = document.getElementById("themeToggleBtn");
if (localStorage.getItem("quiz_theme") === "dark") {
  document.body.classList.add("dark-mode");
  if (themeToggleBtn) themeToggleBtn.innerText = "☀️";
}
if (themeToggleBtn) {
  themeToggleBtn.addEventListener("click", () => {
    const isDark = document.body.classList.toggle("dark-mode");
    localStorage.setItem("quiz_theme", isDark ? "dark" : "light");
    themeToggleBtn.innerText = isDark ? "☀️" : "🌙";
  });
}

const muteBtn = document.getElementById("muteBtn");
if (muteBtn && typeof getMuteState === "function") {
  muteBtn.innerText = getMuteState() ? "🔇" : "🔊";
  muteBtn.addEventListener("click", () => {
    muteBtn.innerText = toggleMute() ? "🔇" : "🔊";
  });
}

let currentFontSize = parseInt(localStorage.getItem("quiz_font_size")) || 100;
function applyFontSize(sizePercent) {
  currentFontSize = Math.min(Math.max(sizePercent, 85), 135);
  localStorage.setItem("quiz_font_size", currentFontSize);
  document.querySelectorAll(".question-title, .option-btn, .review-item, p.desc").forEach(el => {
    el.style.fontSize = `${(currentFontSize / 100) * 1.05}rem`;
  });
}
const fontDecBtn = document.getElementById("fontDecBtn");
const fontIncBtn = document.getElementById("fontIncBtn");
if (fontDecBtn && fontIncBtn) {
  fontDecBtn.addEventListener("click", () => applyFontSize(currentFontSize - 10));
  fontIncBtn.addEventListener("click", () => applyFontSize(currentFontSize + 10));
}

let toastTimeout = null;
function showToast(message, type = "error") {
  const toast = document.getElementById("toastNotification");
  if (!toast) return;
  if (toastTimeout) clearTimeout(toastTimeout);

  toast.innerHTML = `<span>${type === "success" ? "✅" : "⚠️"}</span> <span>${message}</span>`;
  toast.className = `toast ${type}`;
  toast.classList.remove("hidden");
  toastTimeout = setTimeout(() => toast.classList.add("hidden"), 3200);
}

// Kick off App
initApp();