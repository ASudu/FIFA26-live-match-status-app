# FIFA World Cup 2026 Live Updates & Twitter Sharing Dashboard

A real-time Python Flask web application designed to track, filter, search, and share updates for the **FIFA World Cup 2026** (Canada, Mexico, and USA).

The application retrieves match records and real-time live events directly from FIFA's calendar API, localizes timestamps, overlays flags, aggregates match stats, and embeds a premium text generator enabling users to customize and share match updates directly onto X / Twitter.

---

## 🏗️ Architecture Overview

```mermaid
graph TD
    A[User Browser] -->|HTTP Request| B[Flask Server (app.py)]
    B -->|Fetch JSON| C[FIFA API - api.fifa.com]
    B -->|Fallback| D[Local Cache - wc_matches.json]
    A -->|Display Flags| E[FlagCDN - flagcdn.com]
    A -->|Interactive Sharing| F[Twitter Web Intent - twitter.com]
```

### Key Components

* **Flask Backend (`app.py`)**: Proxy server fetching match data dynamically from the FIFA V3 Calendar API with built-in caching.
* **Frontend View (`templates/index.html`)**: Modern, glassmorphic layout displaying match statuses, team flags, scores, and statistics.
* **Styling (`static/css/styles.css`)**: CSS variables for a premium dark mode layout with custom fonts (*Outfit* and *Inter*) and glowing animations.
* **Interactions (`static/js/main.js`)**: Script handling timezone translation, searching, filtering, and opening Twitter intents.

---

## ⚡ Key Features

* **Live Updates Dashboard**: Real-time stats calculation (goals scored, live count, completed games, progress metrics).
* **FlagCDN & Emoji Mapping**: Automatic translation from FIFA's 3-letter codes to standard 2-letter codes for country flag images and emoji flag character formatting.
* **Twitter Intent Builder**: One-click sharing of customizable, pre-formatted templates matching the game's state (Live, Finished, or Scheduled).

---

## ⚙️ Operations: Booting & Shutting Down

### How to Boot the App
To start the Flask development server:

1. **Open your terminal** and navigate to the project directory:
   ```bash
   cd <project-root>
   ```
2. **Activate the Python virtual environment**:
   ```bash
   source venv/bin/activate
   ```
3. **Run the Flask application**:
   ```bash
   python app.py
   ```
4. **Open in browser**:
   Navigate to [http://localhost:5000](http://localhost:5000).

---

### How to Shut Down the App

Depending on how the application was started, choose one of the following methods to terminate it:

#### Method A: If running in the foreground (interactive terminal)
Simply press **`Ctrl + C`** in your active terminal window. This sends an interrupt signal (`SIGINT`) to Werkzeug and gracefully terminates the Flask server.

#### Method B: If running in the background
If the process is running in the background, you can terminate it using one of these commands:

* **Find and kill by port (Recommended)**:
  ```bash
  kill $(lsof -t -i:5000)
  ```
* **Kill by process name**:
  ```bash
  pkill -f "python app.py"
  ```
