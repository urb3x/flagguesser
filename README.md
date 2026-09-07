# 🚩 Flag Guesser

An interactive, modern, and engaging web-based flag guessing game built to test and expand your world geography knowledge.

🌐 **Live Demo:** [https://urb3x.github.io/flagguesser/](https://urb3x.github.io/flagguesser/)

---

## ✨ Features

- **🎮 4 Diverse Game Modes:**
  - **Multiple Choice:** 4 country name choices for each flag.
  - **Pick the Flag (Reverse):** Given a country name, capital, and continent, identify the correct flag among 4 options.
  - **Type & Guess:** Type country names with instant smart fuzzy autocomplete.
  - **Time Attack (60s):** Race against the clock to guess as many flags as possible in 60 seconds!
- **🌍 Continent & Difficulty Filters:**
  - Filter by continent: All, Europe, Asia, Americas, Africa, Oceania.
  - Filter by difficulty: Easy (famous flags), Medium, Hard (lesser-known flags and islands).
- **💡 Smart Hint System:**
  - **50 / 50:** Removes 2 incorrect choices.
  - **Capital City Hint:** Reveals the capital city of the mystery country.
  - **First Letter Hint:** Shows the first letter and length of the country name.
  - **Skip:** Move to the next country when stuck.
- **🔊 Synthesized Web Audio:**
  - Dynamic procedural sound effects for correct answers, wrong answers, celebratory streak fanfares, and game over—no external audio files or dependencies required.
  - Sound mute toggle (`M` key or header icon).
- **🎉 Interactive Celebrations:**
  - Custom canvas confetti engine triggering on milestones and victory streaks.
- **📖 Flag Encyclopedia & Study Mode:**
  - Explore 150+ country flags with capitals and continents.
  - Live search to study flags before jumping into competitive play.
- **⌨️ Keyboard Shortcuts:**
  - Press `1`, `2`, `3`, `4` to pick options instantly.
  - Press `M` to toggle sound.
  - Press `Esc` to close any open modal.
- **📊 Statistics & Sharing:**
  - Tracks total rounds, best score, highest streak, and accuracy saved locally via `localStorage`.
  - Share button copies your current score card to your clipboard!

---

## 🚀 Quick Start (Local Run)

No build tools or installation needed! Simply open `index.html` directly in any web browser, or run a lightweight local server:

```bash
# Python 3
python -m http.server 8000

# Node.js npx
npx serve
```

Then open `http://localhost:8000` in your browser.

---

## 🛠️ Tech Stack

- **HTML5 & Modern CSS3:** Responsive glassmorphism interface, CSS Grid/Flexbox, custom animations.
- **Vanilla JavaScript (ES6+):** Pure client-side logic with zero external framework dependencies.
- **Web Audio API:** Hardware-accelerated procedural sound synthesizer.
- **FlagCDN:** High-definition SVG and PNG flag imagery.
- **GitHub Actions & GitHub Pages:** Automated continuous deployment.

---

## 📜 License

MIT License © 2026 [urb3x](https://github.com/urb3x)