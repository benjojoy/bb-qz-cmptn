// =============================================================
// ADMIN DASHBOARD & SETTINGS MODULE
// =============================================================
const ADMIN_PIN = "4753";
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzIFuKTOW-CC9dhuxRGMXNuVE2L3aRzteu4FAhRBPBt6H0VMWISeUq83fh5LXd26vr3Rw/exec";

const adminBtn = document.getElementById("adminBtn");
const adminModal = document.getElementById("adminModal");
const closeAdminBtn = document.getElementById("closeAdminBtn");
const submitAdminPassBtn = document.getElementById("submitAdminPassBtn");
const adminPassInput = document.getElementById("adminPassInput");
const adminAuthScreen = document.getElementById("adminAuthScreen");
const adminDataScreen = document.getElementById("adminDataScreen");
const refreshAdminBtn = document.getElementById("refreshAdminBtn");
const adminSettingsForm = document.getElementById("adminSettingsForm");

if (adminBtn) {
  adminBtn.addEventListener("click", () => {
    adminModal.classList.remove("hidden");
    if (adminPassInput) adminPassInput.focus();
  });

  closeAdminBtn.addEventListener("click", () => {
    adminModal.classList.add("hidden");
    if (adminPassInput) adminPassInput.blur();
  });

  if (adminPassInput) {
    adminPassInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.keyCode === 13) {
        e.preventDefault();
        adminPassInput.blur();
        if (submitAdminPassBtn) submitAdminPassBtn.click();
      }
    });
  }

  submitAdminPassBtn.addEventListener("click", () => {
    const enteredPin = adminPassInput ? adminPassInput.value.trim() : "";
    if (!enteredPin) {
      showToast("Please enter the PIN", "error");
      if (adminPassInput) adminPassInput.focus();
      return;
    }

    if (enteredPin === ADMIN_PIN) {
      adminAuthScreen.classList.add("hidden");
      adminDataScreen.classList.remove("hidden");
      adminPassInput.value = "";
      adminPassInput.blur();
      loadAdminMetrics();
      populateAdminSettingsForm();
    } else {
      showToast("Incorrect PIN! Please try again.", "error");
      adminPassInput.value = "";
      adminPassInput.focus();
    }
  });

  if (refreshAdminBtn) {
    refreshAdminBtn.addEventListener("click", loadAdminMetrics);
  }
}

async function loadAdminMetrics() {
  document.getElementById("admTotalAttempts").innerText = "...";
  document.getElementById("admAvgScore").innerText = "...";
  document.getElementById("admTopPerformers").innerHTML = "Loading...";

  try {
    const responses = await fetchSheetData("Responses");
    if (!responses || responses.length <= 1) {
      document.getElementById("admTotalAttempts").innerText = "0";
      document.getElementById("admAvgScore").innerText = "0%";
      document.getElementById("admTopPerformers").innerHTML = "No responses recorded yet.";
      return;
    }

    const rows = responses.slice(1);
    const total = rows.length;
    let totalScore = 0;
    let totalPossible = 0;
    let leaderboard = [];

    rows.forEach(r => {
      const name = r[1] || "Anonymous";
      const score = Number(r[3]) || 0;
      const possible = Number(r[4]) || 5;
      totalScore += score;
      totalPossible += possible;
      leaderboard.push({ name, score, possible, percent: Math.round((score / possible) * 100) });
    });

    const avg = totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : 0;
    document.getElementById("admTotalAttempts").innerText = total;
    document.getElementById("admAvgScore").innerText = `${avg}%`;

    leaderboard.sort((a, b) => b.score - a.score || b.percent - a.percent);
    const top5 = leaderboard.slice(0, 5);

    let html = "<ol style='padding-left: 20px; margin: 0;'>";
    top5.forEach(p => {
      html += `<li style='margin-bottom: 6px;'><strong>${p.name}</strong> — ${p.score}/${p.possible} (${p.percent}%)</li>`;
    });
    html += "</ol>";

    document.getElementById("admTopPerformers").innerHTML = html;
  } catch (err) {
    document.getElementById("admTopPerformers").innerHTML = `<span style="color:red">Failed to read Responses tab: ${err.message}</span>`;
  }
}

function populateAdminSettingsForm() {
  if (!settings) return;

  document.getElementById("admSetTitle").value = settings["quiz title"] || "";

  const bookSelect = document.getElementById("admSetBook");
  if (bookSelect && settings["book filter"]) {
    bookSelect.value = settings["book filter"].trim();
  }

  const rawCategory = String(settings["category filter"] || "").trim();
  const selectedChapters = rawCategory.toLowerCase() === "all" || !rawCategory
    ? ["Chapter 1", "Chapter 2", "Chapter 3", "Chapter 4"]
    : rawCategory.split(",").map(c => c.trim().toLowerCase());

  document.querySelectorAll('input[name="chapterFilter"]').forEach(cb => {
    cb.checked = (rawCategory.toLowerCase() === "all" || !rawCategory) ? true : selectedChapters.includes(cb.value.toLowerCase());
  });

  document.getElementById("admSetDuration").value = settings["quiz duration minutes"] || 3;
  document.getElementById("admSetEasy").value = settings["easy count"] || 0;
  document.getElementById("admSetMedium").value = settings["medium count"] || 0;
  document.getElementById("admSetHard").value = settings["hard count"] || 0;
  document.getElementById("admSetShuffleQ").checked = String(settings["shuffle questions"]).toUpperCase() === "TRUE";
  document.getElementById("admSetShuffleOpt").checked = String(settings["shuffle options"]).toUpperCase() === "TRUE";
  document.getElementById("admSetReqPhone").checked = String(settings["require phone"]).toUpperCase() === "TRUE";
  document.getElementById("admSetProgressBar").checked = String(settings["show progress bar"]).toUpperCase() === "TRUE";
}

if (adminSettingsForm) {
  adminSettingsForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const saveBtn = document.getElementById("saveSettingsBtn");
    saveBtn.disabled = true;
    saveBtn.innerText = "Saving to Google Sheet...";

    const checkedBoxes = Array.from(document.querySelectorAll('input[name="chapterFilter"]:checked'));
    let categoryValue = (checkedBoxes.length === 0 || checkedBoxes.length === 13) 
      ? "All" 
      : checkedBoxes.map(cb => cb.value).join(", ");

    const updated = {
      "Quiz Title": document.getElementById("admSetTitle").value.trim(),
      "Book Filter": document.getElementById("admSetBook").value.trim(),
      "Category Filter": categoryValue,
      "Quiz Duration Minutes": document.getElementById("admSetDuration").value,
      "Easy Count": document.getElementById("admSetEasy").value,
      "Medium Count": document.getElementById("admSetMedium").value,
      "Hard Count": document.getElementById("admSetHard").value,
      "Number of Questions": (
        Number(document.getElementById("admSetEasy").value) +
        Number(document.getElementById("admSetMedium").value) +
        Number(document.getElementById("admSetHard").value)
      ),
      "Shuffle Questions": document.getElementById("admSetShuffleQ").checked ? "TRUE" : "FALSE",
      "Shuffle Options": document.getElementById("admSetShuffleOpt").checked ? "TRUE" : "FALSE",
      "Require Phone": document.getElementById("admSetReqPhone").checked ? "TRUE" : "FALSE",
      "Show Progress Bar": document.getElementById("admSetProgressBar").checked ? "TRUE" : "FALSE"
    };

    try {
      await fetch(SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updateSettings", settings: updated })
      });

      showToast("Saved successfully! Reloading to apply changes.", "success");
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      showToast("Error saving settings: " + err.message, "error");
      saveBtn.disabled = false;
      saveBtn.innerText = "💾 Save Settings to Google Sheet";
    }
  });
}