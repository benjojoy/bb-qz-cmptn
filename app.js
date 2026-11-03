// App Entry & Event Wiring
async function initApp() {
  try {
    const { settings, questions } = await loadQuizData();

    document.getElementById("quizTitle").innerText = settings["quiz title"] || "Bible Quiz";
    document.getElementById("quizDesc").innerText = "Answer all questions.\nEach question carries 1 point.\nNo negative marking.";
    document.getElementById("progressText").innerText = `Total Questions: ${questions.length}`;
    document.getElementById("startBtn").disabled = false;

    // Dynamically update label based on requirement setting
    const isPhoneRequired = String(settings["require phone"]).toUpperCase() === "TRUE";
    const phoneLabel = document.getElementById("phoneLabel");
    if (phoneLabel) {
      phoneLabel.innerText = isPhoneRequired 
        ? "WhatsApp Number *" 
        : "WhatsApp Number (Optional)";
    }
  } catch (err) {
    document.getElementById("quizDesc").innerText = "Error loading quiz data: " + err.message;
    console.error(err);
  }
}

// 1. Start Quiz Click
document.getElementById("startBtn").addEventListener("click", () => {
  initAudio();

  const name = document.getElementById("nameInput").value.trim();
  if (!name) return alert("Please enter your name.");

  const isPhoneRequired = String(settings["require phone"]).toUpperCase() === "TRUE";
  const phone = document.getElementById("phoneInput").value.trim();

  if (isPhoneRequired && !phone) {
    return alert("Please enter your WhatsApp number.");
  }

  document.getElementById("startScreen").classList.add("hidden");
  document.getElementById("quizScreen").classList.remove("hidden");

  startQuizEngine();
});

// 2. Next / Submit Click
document.getElementById("nextBtn").addEventListener("click", handleNextOrSubmit);

// 3. Retake Click
const retakeBtn = document.getElementById("retakeBtn");
if (retakeBtn) {
  retakeBtn.addEventListener("click", retakeQuizAction);
}

// 4. Refresh Quiz Handler
const refreshBtn = document.getElementById("refreshBtn");
if (refreshBtn) {
  refreshBtn.addEventListener("click", () => {
    window.location.reload();
  });
}

// 5. Generate & Download Review as PDF
const downloadPdfBtn = document.getElementById("downloadPdfBtn");
if (downloadPdfBtn) {
  downloadPdfBtn.addEventListener("click", () => {
    const element = document.getElementById("resultScreen");
    const name = document.getElementById("nameInput").value.trim() || "Participant";

    // Hide buttons temporarily during PDF capture
    const buttons = element.querySelectorAll("button");
    buttons.forEach(b => b.style.display = "none");

    const opt = {
      margin:       10,
      filename:     `Bible_Quiz_Review_${name.replace(/\s+/g, '_')}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save().then(() => {
      // Restore buttons after PDF is created
      buttons.forEach(b => b.style.display = "");
    });
  });
}

// 6. Pre-fill WhatsApp with Score & Detailed Review Breakdown
const shareWhatsAppBtn = document.getElementById("shareWhatsAppBtn");
if (shareWhatsAppBtn) {
  shareWhatsAppBtn.addEventListener("click", () => {
    const name = document.getElementById("nameInput").value.trim();
    const phone = document.getElementById("phoneInput").value.replace(/[^0-9]/g, ""); // strip non-digits
    const scoreText = document.getElementById("scoreValue").innerText;
    const percentText = document.getElementById("scorePercent").innerText;
    const quizTitle = document.getElementById("quizTitle").innerText;

    // Header Summary
    let msg = `📖 *${quizTitle} - Result*\n\n` +
              `👤 *Participant:* ${name}\n` +
              `🎯 *Score:* ${scoreText} (${percentText})\n\n` +
              `*Review Answers:*\n\n`;

    // Loop through each question to append full Q&A breakdown
    questions.forEach((q, i) => {
      const res = userResponses[i];
      const isCorrect = res ? res.isCorrect : false;
      const userAns = res && res.selected ? res.selected : "Not Answered";
      const icon = isCorrect ? "✅" : "❌";

      // Answers, References & Explanations
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

      const ref = (res && res.reference) ? res.reference : (q[colIndex.ref] || "");
      const exp = (res && res.explanation) ? res.explanation : (q[colIndex.exp] || "");

      msg += `${i + 1}. ${q[colIndex.question]}\n`;
      msg += `Your Answer: ${userAns} ${icon}\n`;
      if (!isCorrect) {
        msg += `Correct Answer: ${correctDisplay}\n`;
      }
      if (ref) {
        msg += `📖 Reference: ${ref}\n`;
      }
      if (exp) {
        msg += `💡 Explanation: ${exp}\n`;
      }
      msg += `\n`; // Spacing between questions
    });

    const encodedMsg = encodeURIComponent(msg.trim());

    if (phone.length >= 10) {
      const formattedPhone = phone.length === 10 ? `91${phone}` : phone;
      window.open(`https://api.whatsapp.com/send?phone=${formattedPhone}&text=${encodedMsg}`, "_blank");
    } else {
      window.open(`https://api.whatsapp.com/send?text=${encodedMsg}`, "_blank");
    }
  });
}

initApp();
