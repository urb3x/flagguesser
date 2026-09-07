# 🚩 Flag Guesser

An interactive, modern web-based flag guessing game with typo-tolerant typing and 1v1 PvP Duels via 4-digit room codes!

🌐 **Live Website:** [https://urb3x.github.io/flagguesser/](https://urb3x.github.io/flagguesser/)

---

## ✨ Features

- **⌨️ Typo-Tolerant Typing (Typos Count as Good Answers!):**
  - Clean, pure typing interface with no distracting autocomplete popups.
  - **Typos Count as Good Answers:** If you misspell the country name slightly (e.g. `germny` for Germany, `swizerland` for Switzerland, `argntina` for Argentina, `united statse` for United States), it **counts as a correct answer**!
  - **Invalid Country Detection:** If you type something that does not exist in the world (e.g. `asdfghjkl`), it informs you: `⚠️ Invalid country!` without deducting a life.
  - **Alias Support:** Recognizes common abbreviations like `USA`, `UK`, `UAE`, `Korea`, etc.
- **⚔️ 1v1 PvP Duel with 4-Digit Room Code:**
  - **Host a Match:** Click "Create 4-Digit Room" to get a unique code (e.g. `7429`) and a 1-click shareable invite link (`?room=7429`).
  - **Join with Code:** Your friend enters the 4-digit code and connects in real-time over serverless WebRTC.
  - **Pass & Play (Same Device):** Supports 2 players on a single device without internet rooms.
  - **Live Scoreboard & Synced Turns:** Players alternate guessing the mystery flags with instant real-time score updates.
  - **Celebration Ceremony:** Winner showdown screen with confetti and instant Rematch.
- **🎮 Solo Challenge Mode:**
  - 3 lives survival mode.
  - Streak tracking with celebratory fanfares.
  - Continent filter (Europe, Asia, Americas, Africa, Oceania, All).
- **🔊 Synthesized Web Audio API:**
  - Built-in hardware audio effects for button clicks, correct guesses, wrong answers, streak fanfares, and game over.
  - Mute toggle (`M` key or header button).
- **🎉 Physics Canvas Confetti:**
  - Custom particle confetti on winning PvP duels and high score streaks.
- **📊 Stats & Share:**
  - Track total rounds, accuracy, best streak, and high score.
  - Share your score card directly to your clipboard.

---

## 🚀 Quick Start (Local Run)

Zero build step or installation required. Open `index.html` directly in any browser:

```bash
# Python local server
python -m http.server 8000

# or Node.js
npx serve
```

Then visit `http://localhost:8000`.

---

## 📜 License

MIT License © 2026 [urb3x](https://github.com/urb3x)