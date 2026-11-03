const SPREADSHEET_ID = "1HgFUzf11pVn8W7WK-6PJ_22QnhSXMAEJ6ERz5OuMqVo";

let settings = {};
let questions = [];
let currentLang = localStorage.getItem("quiz_lang") || "ml"; // 'ml' or 'en'

let colIndex = { 
  id: 0, book: 1, category: 2, type: 3, 
  question: 4, optA: 5, optB: 6, optC: 7, optD: 8, 
  answer: 9, diff: 10, ref: 11, exp: 12,
  // English column indices:
  question_en: -1, optA_en: -1, optB_en: -1, optC_en: -1, optD_en: -1, exp_en: -1
};

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

async function loadQuizData() {
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

  const targetBook = (settings["book filter"] || settings["book"] || "ALL").replace(/\s+/g, " ").trim().toUpperCase();
  const targetCategory = (settings["category filter"] || settings["category"] || "ALL").replace(/\s+/g, " ").trim().toUpperCase();
  const targetDifficulty = (settings["difficulty filter"] || settings["difficulty"] || "ALL").replace(/\s+/g, " ").trim().toUpperCase();

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
  colIndex.question_en = findIdx(h => h.includes("question") && (h.includes("en") || h.includes("eng")), -1);
  colIndex.optA_en = findIdx(h => (h.includes("opt a") || h.includes("option a") || h === "a") && (h.includes("en") || h.includes("eng")), -1);
  colIndex.optB_en = findIdx(h => (h.includes("opt b") || h.includes("option b") || h === "b") && (h.includes("en") || h.includes("eng")), -1);
  colIndex.optC_en = findIdx(h => (h.includes("opt c") || h.includes("option c") || h === "c") && (h.includes("en") || h.includes("eng")), -1);
  colIndex.optD_en = findIdx(h => (h.includes("opt d") || h.includes("option d") || h === "d") && (h.includes("en") || h.includes("eng")), -1);
  colIndex.exp_en = findIdx(h => h.includes("exp") && (h.includes("en") || h.includes("eng")), -1);

  let pool = rawQuestions.slice(1).filter(r => r && r[colIndex.question] && String(r[colIndex.question]).trim() !== "");

  if (targetBook !== "ALL" && targetBook !== "") {
    pool = pool.filter(r => String(r[colIndex.book] || "").replace(/\s+/g, " ").trim().toUpperCase() === targetBook);
  }

  if (targetCategory !== "ALL" && targetCategory !== "") {
    pool = pool.filter(r => String(r[colIndex.category] || "").replace(/\s+/g, " ").trim().toUpperCase() === targetCategory);
  }

  if (targetDifficulty !== "ALL" && targetDifficulty !== "") {
    pool = pool.filter(r => String(r[colIndex.diff] || "").replace(/\s+/g, " ").trim().toUpperCase() === targetDifficulty);
  }

  if (pool.length === 0) {
    throw new Error("No questions found matching the chosen filters.");
  }

  // Question Selection
  let selected = [];
  const easyCount = Number(settings["easy count"]) || 0;
  const mediumCount = Number(settings["medium count"]) || 0;
  const hardCount = Number(settings["hard count"]) || 0;
  let targetTotal = Number(settings["number of questions"]) || (easyCount + mediumCount + hardCount);
  if (targetTotal <= 0) targetTotal = pool.length;

  if (targetDifficulty !== "ALL" && targetDifficulty !== "") {
    shuffle(pool);
    selected = pool.slice(0, Math.min(targetTotal, pool.length));
  } else {
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

  return { settings, questions, colIndex };
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getLocalizedText(row, mlIdx, enIdx) {
  if (currentLang === "en" && enIdx !== -1 && row[enIdx] && String(row[enIdx]).trim() !== "") {
    return String(row[enIdx]).trim();
  }
  return String(row[mlIdx] || "").trim();
}
