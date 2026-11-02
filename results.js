const SUBMIT_API_URL = "https://script.google.com/macros/s/AKfycbzIFuKTOW-CC9dhuxRGMXNuVE2L3aRzteu4FAhRBPBt6H0VMWISeUq83fh5LXd26vr3Rw/exec";

function showQuizResults(questions, userResponses, settings, colIndex) {
  document.getElementById("progressBar").style.width = "100%";
  document.getElementById("quizScreen").classList.add("hidden");
  document.getElementById("timerBadge").classList.add("hidden");
  document.getElementById("resultScreen").classList.remove("hidden");

  let score = 0;
  userResponses.forEach(r => { if (r && r.isCorrect) score++; });

  const total = questions.length;
  const percent = total > 0 ? Math.round((score / total) * 100) : 0;

  // Background logging to Google Sheets via Web App
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
