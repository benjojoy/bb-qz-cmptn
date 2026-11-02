// App Entry & Event Wiring
async function initApp() {
  try {
    const { settings, questions } = await loadQuizData();

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

// 1. Start Quiz Click
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

  startQuizEngine();
});

// 2. Next / Submit Click
document.getElementById("nextBtn").addEventListener("click", handleNextOrSubmit);

// 3. Retake Click
const retakeBtn = document.getElementById("retakeBtn");
if (retakeBtn) {
  retakeBtn.addEventListener("click", retakeQuizAction);
}

initApp();
