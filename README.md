# 📖 Bible Quiz Web Application

A lightweight, mobile-first, bilingual (Malayalam / English) Bible Quiz application designed for personal study and competitive church quizzes. The application operates as a static client-side web application powered by a Google Sheet database backend via Google Visualization API (GVIZ JSONP) and Apps Script.

---

## 🚀 Key Features

- **Zero-CORS Database Backend:** Fetches dynamic questions, options, translations, and global configuration live from Google Sheets using JSONP (`tqx=responseHandler`).
- **Dynamic Multi-Chapter Filtering:** Participants can choose any combination of chapters directly from the start screen, or select "All Chapters" with real-time question count recalculation.
- **Bilingual Support:** Full native support for Malayalam and English (ESV) questions, explanations, and scripture references.
- **PIN-Protected Admin Console:**
  - Accessible via the lock icon (`🔒`) in the navigation bar using a 4-digit PIN (`4753`).
  - View real-time participation metrics, submission count, average scores, and top 5 leaderboards.
  - Modify live quiz parameters (Title, Book filter, Question limits, Durations, Progress bars, Shuffling) and sync updates directly back to Google Sheets.
- **Audio Feedback & Accessibility:** Sound effects for correct/wrong selections (with mute toggle), plus dynamic Malayalam font resizing buttons (`A+` / `A-`).
- **Mobile-Optimized Scripture Review:** In-app scripture reference viewing to prevent mobile browsers from discarding state or refreshing on external app return.
- **Export & Sharing:**
  - Client-side PDF generation of question-by-question performance breakdowns via `html2pdf.js`.
  - Instant pre-formatted WhatsApp result sharing.

---

## 📁 Project Architecture

The codebase follows a modular structure separated by clear separation of concerns:

```text
├── index.html             # Clean, minimal semantic layout & modal containers
├── css/
│   └── style.css          # Core styles, responsive layout, animations, Dark/Light modes
├── js/
│   ├── sheetService.js    # Google Sheet GVIZ JSONP fetcher, column mapper, data loaders
│   ├── audio.js           # Audio playback logic & mute state persistence
│   ├── quizEngine.js      # Quiz loop, state management, timer interval, score evaluation
│   ├── results.js         # Result screen renderer, in-app Bible modal, WhatsApp & PDF export
│   ├── admin.js           # Admin authentication, metric aggregation, Apps Script sync
│   └── app.js             # Entry point, validation checks, chapter filters, DOM wiring
└── README.md
```

---

## ⚙️ Google Sheet Schema Configuration

The application expects a Google Spreadsheet with three primary sheets (tabs):

### 1. `Questions` Tab
| Column | Name | Description |
| :--- | :--- | :--- |
| **A** | `ID` | Numeric question identifier |
| **B** | `Book` | Book name (e.g., `2 Corinthians`) |
| **C** | `Category` | Chapter name (e.g., `Chapter 1`, `Chapter 2`) |
| **D** | `Type` | Question type: `MCQ` or `TF` |
| **E** | `Question` | Malayalam question text |
| **F** | `Question_EN` | English question text |
| **G–J** | `Option A` – `Option D` | Options in Malayalam |
| **K–N** | `Option A_EN` – `D_EN` | Options in English |
| **O** | `Answer` | Correct answer key (`A`, `B`, `C`, or `D`) |
| **P** | `Difficulty` | Difficulty level (`Easy`, `Medium`, `Hard`) |
| **Q** | `Reference` | Scripture reference (e.g., `2 Corinthians 1:3`) |
| **R** | `Explanation` | Malayalam commentary / reasoning |
| **S** | `Explanation_EN`| English commentary / reasoning |

### 2. `Settings` Tab
Two-column key-value configuration table:
- `Quiz Title`: Header display title
- `Book Filter`: Book to load questions from (or `ALL`)
- `Category Filter`: Comma-separated chapter filter fallback
- `Quiz Duration Minutes`: Countdown timer limit
- `Number of Questions`: Total questions to pick per attempt
- `Easy Count` / `Medium Count` / `Hard Count`: Weighted distribution
- `Shuffle Questions`: `TRUE` / `FALSE`
- `Shuffle Options`: `TRUE` / `FALSE`
- `Require Phone`: `TRUE` / `FALSE`
- `Show Progress Bar`: `TRUE` / `FALSE`

### 3. `Responses` Tab
Captures quiz attempts submitted via Google Apps Script:
- `Timestamp` | `Name` | `Phone` | `Score` | `Total` | `Percentage`

---

## 🛠️ Deployment & Git Strategy

The repository follows a two-tier branching strategy paired with automated CI/CD:

```text
feature/*  ──(PR)──>  development [Staging: Cloudflare Pages]  ──(PR)──>  main [Production: GitHub Pages]
```

### 1. Local Development
Run a local static server to test changes without CORS restrictions:
```bash
# Python
python -m http.server 8000

# Node.js
npx serve .
```

### 2. Staging (`development` Branch)
- **Host:** Cloudflare Pages (`https://bb-quiz-dev.pages.dev`)
- Every push or merged PR into the `development` branch triggers an automated build with edge-level DDoS protection.

### 3. Production (`main` Branch)
- **Host:** GitHub Pages (`https://benjojoy.github.io/bb-qz-cmptn/`)
- Deploys automatically when changes from `development` are reviewed and merged into `main`.

---

## 🔒 Security Notes

- The Admin PIN (`4753`) protects the management dashboard.
- Apps Script Web App write-backs execute via `no-cors` POST requests, preventing unauthorized cross-origin header inspection.
- When configuring Apps Script, deploy as:
  - **Execute as:** `Me`
  - **Who has access:** `Anyone`