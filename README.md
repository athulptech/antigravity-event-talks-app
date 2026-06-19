# 📊 BigQuery Release Notes Hub

A modern, highly polished web dashboard that tracks, filters, and shares Google Cloud BigQuery release notes. Built using a lightweight **Python Flask** backend and a custom **glassmorphic Vanilla HTML/CSS/JS** frontend.

---

## 🌟 Key Features

* **📡 Smart Feed Parsing**: Fetches the official Google Cloud BigQuery release notes Atom feed. Individual daily entries containing multiple updates (e.g., several features and issues on the same day) are parsed and split into distinct cards.
* **⚡ High Performance Caching**: Caches feed entries locally in a structured JSON format to guarantee instant load times. Bypasses the cache when the user triggers a manual refresh.
* **🔍 Fuzzy Search & Pill Filters**: Real-time keyword search across dates, update types, and descriptions, combined with category pill filters (Features, Announcements, Issues, Deprecations) showing live match counts.
* **🎨 Premium Aesthetics**: A sleek dark mode design (`#080c14` theme) utilizing modern typography (Google Fonts *Outfit* & *Inter*), glowing status badges, smooth transitions, and a floating selection manager.
* **🐦 Advanced Tweet Composer**:
  * Checkbox select mechanism to tweet a single update or compile multiple updates into a single summary.
  * Custom modal editor with an SVG-animated character count ring.
  * Respects X/Twitter's character metrics (280-char limit where any URL counts as exactly 23 characters).
  * Automatically trims the text snippet to fit exactly within the limit before opening the X sharing Web Intent.

---

## 🛠️ Tech Stack & Architecture

* **Backend**: Python 3.13+, Flask, BeautifulSoup4, Requests, XML ElementTree.
* **Frontend**: Vanilla HTML5, CSS3 (CSS Variables, Flexbox, Grid, custom keyframe animations), ES6+ JavaScript.
* **Icons & Typography**: FontAwesome v6, Google Fonts (*Outfit*, *Inter*, *JetBrains Mono*).

### Directory Structure

```text
bq-release-notes/
├── app.py                  # Flask server, Atom XML parser, and caching logic
├── requirements.txt        # Backend dependencies
├── releases_cache.json     # Local JSON cache of the release notes
├── templates/
│   └── index.html          # Responsive single-page application structure
└── static/
    ├── css/
    │   └── style.css       # Premium style sheet (custom scrollbars, badges, modal)
    └── js/
        └── app.js          # Core frontend engine (filtering, selection, character counter)
```

---

## 🚀 Setup & Installation

Follow these steps to set up and run the application locally.

### Prerequisites
Make sure you have **Python 3.13 or newer** installed.

### 1. Clone the Repository
```bash
git clone https://github.com/athulptech/antigravity-event-talks-app.git
cd bq-release-notes
```

### 2. Create and Activate a Virtual Environment
**On Windows (PowerShell):**
```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

**On macOS/Linux:**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

---

## 🖥️ How to Run

1. Start the Flask development server:
   ```bash
   python app.py
   ```
2. Open your browser and navigate to:
   **[http://127.0.0.1:5000](http://127.0.0.1:5000)**

* **Manual Refresh**: Click the **Refresh** button in the header to bypass the cache and fetch the latest live updates from Google Cloud.
* **Tweeting an Update**: Click the **Tweet** button on any card or check multiple cards to open the custom Tweet Composer modal, then click **Post to X**.
