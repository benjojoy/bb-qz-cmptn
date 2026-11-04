const SUBMIT_API_URL = "https://script.google.com/macros/s/AKfycbzIFuKTOW-CC9dhuxRGMXNuVE2L3aRzteu4FAhRBPBt6H0VMWISeUq83fh5LXd26vr3Rw/exec";

function getBibleLink(bookName, ref) {
  if (!ref) return "";
  
  const bookCodes = {
    "GENESIS": "GEN", "EXODUS": "EXO", "LEVITICUS": "LEV", "NUMBERS": "NUM", "DEUTERONOMY": "DEU",
    "JOSHUA": "JDG", "JUDGES": "JDG", "RUTH": "RUT", "1 SAMUEL": "1SA", "2 SAMUEL": "2SA",
    "1 KINGS": "1KI", "2 KINGS": "2KI", "1 CHRONICLES": "1CH", "2 CHRONICLES": "2CH",
    "EZRA": "EZR", "NEHEMIAH": "NEH", "ESTHER": "EST", "JOB": "JOB", "PSALMS": "PSA", "PROVERBS": "PRO",
    "ECCLESIASTES": "ECC", "SONG OF SOLOMON": "SNG", "ISAIAH": "ISA", "JEREMIAH": "JER",
    "LAMENTATIONS": "LAM", "EZEKIEL": "EZK", "DANIEL": "DAN", "HOSEA": "HOS", "JOEL": "JOL",
    "AMOS": "AMO", "OBADIAH": "OBA", "JONAH": "JON", "MICAH": "MIC", "NAHUM": "NAM",
    "HABAKKUK": "HAB", "ZEPHANIAH": "ZEP", "HAGGAI": "HAG", "ZECHARIAH": "ZEC", "MALACHI": "MAL",
    "MATTHEW": "MAT", "MARK": "MRK", "LUKE": "LUK", "JOHN": "JHN", "ACTS": "ACT",
    "ROMANS": "ROM", "1 CORINTHIANS": "1CO", "2 CORINTHIANS": "2CO", "GALATIANS": "GAL",
    "EPHESIANS": "EPH", "PHILIPPIANS": "PHP", "COLOSSIANS": "COL", "1 THESSALONIANS": "1TH",
    "2 THESSALONIANS": "2TH", "1 TIMOTHY": "1TI", "2 TIMOTHY": "2TI", "TITUS": "TIT",
    "PHILEMON": "PHM", "HEBREWS": "HEB", "JAMES": "JAS", "1 PETER": "1PE", "2 PETER": "2PE",
    "1 JOHN": "1JN", "2 JOHN": "2JN", "3 JOHN": "3JN", "JUDE": "JUD", "REVELATION": "REV"
  };

  const cleanBook = String(bookName || "").trim().toUpperCase();
  const code = bookCodes[cleanBook] || "2CO";

  // 1. Separate Chapter and Verse section
  const colonParts = ref.split(":");
  const chapter = (colonParts[0] || "").replace(/[^0-9]/g, "") || "1";

  // 2. Extract all verse numbers
  const versePartStr = colonParts[1] ? colonParts[1].trim() : "1";
  const matchedNumbers = versePartStr.match(/\d+/g);

  let formattedVerse = "1";
  if (matchedNumbers && matchedNumbers.length > 0) {
    if (matchedNumbers.length === 1) {
      formattedVerse = matchedNumbers[0];
    } else {
      // Takes lowest and highest to form a proper Bible.com range
      const first = matchedNumbers[0];
      const last = matchedNumbers[matchedNumbers.length - 1];
      formattedVerse = `${first}-${last}`;
    }
  }

  if (currentLang === "en") {
    return `https://www.bible.com/bible/59/${code}.${chapter}.${formattedVerse}.ESV`;
  }
  return `https://www.bible.com/bible/1693/${code}.${chapter}.${formattedVerse}.MALOVBSI`;
}

function showQuizResults(questions, userResponses, settings, colIndex) {
  const header = document.querySelector(".header");
  if (header) header.classList.add("hidden");
  document.getElementById("progressBar").style.width = "100%";
  document.getElementById("quizScreen").classList.add("hidden");
  document.getElementById("timerBadge").classList.add("hidden");
  document.getElementById("resultScreen").classList.remove("hidden");

  let score = 0;
  userResponses.forEach(r => { if (r && r.isCorrect) score++; });

  const total = questions.length;
  const percent = total > 0 ? Math.round((score / total) * 100) : 0;
  const accuracyStr = `${percent}%`;

  const participantName = document.getElementById("nameInput").value.trim();
  const participantPhone = document.getElementById("phoneInput") ? document.getElementById("phoneInput").value.trim() : "";

  // Direct, clean submission to Google Sheets
  if (SUBMIT_API_URL) {
    fetch(SUBMIT_API_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: participantName,
        phone: participantPhone,
        score: score,
        total: total,
        accuracy: accuracyStr
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
      ${participantName}
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
    
    const notAnsweredText = currentLang === "en" ? "Not Answered" : "രേഖപ്പെടുത്തിയിട്ടില്ല";
    const userAns = res && res.selected ? res.selected : notAnsweredText;

    const type = String(q[colIndex.type] || "MCQ").trim().toUpperCase();
    const ansKey = String(q[colIndex.answer] || "").trim().toUpperCase();
    let correctDisplay = "";

    if (type === "TF") {
      correctDisplay = currentLang === "en" 
        ? (ansKey === "A" ? "True" : "False")
        : (ansKey === "A" ? "ശരി" : "തെറ്റ്");
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
    const ref = (res && res.reference) ? res.reference : (q[colIndex.ref] || q[11] || "");
    const expText = getLocalizedText(q, colIndex.exp, colIndex.exp_en);

    const yourAnsLabel = currentLang === "en" ? "Your Answer" : "Your Answer";
    const correctAnsLabel = currentLang === "en" ? "Correct Answer" : "Correct Answer";
    const refLabel = currentLang === "en" ? "Reference" : "Reference";
    const expLabel = currentLang === "en" ? "Explanation" : "Explanation";
    const bibleBtnText = currentLang === "en" ? "📖 Read in Bible ↗" : "📖 Read in Bible ↗";
    const bibleUrl = getBibleLink(q[colIndex.book], ref);

    const div = document.createElement("div");
    div.className = `review-item ${isCorrect ? 'pass' : 'fail'}`;
    div.innerHTML = `
      <div style="font-weight:700; margin-bottom: 6px; font-size: 1rem;">${i + 1}. ${qText}</div>
      <div style="font-size:0.95rem; margin-bottom: 4px;">
        ${yourAnsLabel}: <strong>${userAns}</strong> ${isCorrect ? '✅' : '❌'}
      </div>
      ${!isCorrect ? `
        <div style="font-size:0.95rem; color: var(--correct); font-weight: 600; margin-bottom: 6px;">
          ${correctAnsLabel}: ${correctDisplay}
        </div>
      ` : ''}
      ${(ref || expText) ? `
        <div class="feedback-box">
          ${ref ? `
            <div style="font-weight: 600; color: #4338ca; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 6px;">
              <span>📖 <strong>${refLabel}:</strong> ${ref}</span>
              ${bibleUrl ? `
                <a href="${bibleUrl}" target="_blank" rel="noopener noreferrer external" style="font-size: 0.85rem; background: #e0e7ff; color: #4338ca; padding: 3px 8px; border-radius: 6px; text-decoration: none; font-weight: 700;">
                  ${bibleBtnText}
                </a>
              ` : ''}
            </div>
          ` : ''}
          ${expText ? `<div style="margin-top: 6px; line-height: 1.5;">💡 <strong>${expLabel}:</strong> ${expText}</div>` : ''}
        </div>
      ` : ''}
    `;
    review.appendChild(div);
  });
  // At the end of showQuizResults():
 sessionStorage.setItem("quiz_review_active", "true");
 sessionStorage.setItem("quiz_cached_responses", JSON.stringify(userResponses));
  
}
