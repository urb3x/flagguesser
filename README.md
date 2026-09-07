# 🚩 Flag Guesser

An interactive, modern web-based flag guessing game with fuzzy autocorrect typing and 1v1 PvP Duel mode!

🌐 **Live Website:** [https://urb3x.github.io/flagguesser/](https://urb3x.github.io/flagguesser/)

---

## ✨ Features

- **⌨️ Type to Guess with Smart Fuzzy Autocorrect:**
  - Mandatory country name typing for a genuine geography challenge.
  - **Fuzzy Autocorrect Engine:** Automatically forgives typos and misspellings (e.g. `germny` &rarr; Germany, `swizerland` &rarr; Switzerland, `united statse` &rarr; United States, `brasil` &rarr; Brazil).
  - **Alias Support:** Recognizes shortcuts and aliases like `USA`, `UK`, `UAE`, `Korea`, `Holland`, and `Czechia`.
  - **Real-time Autocomplete:** Instant interactive suggestions as you type with keyboard navigation.
- **⚔️ 1v1 PvP Duel Mode:**
  - Battle a friend head-to-head on the same device!
  - Alternating turns with active player indicators and scoreboards (🔵 Player 1 vs 🟠 Player 2).
  - Customizable match length (6, 10, or 20 flags).
  - Winner ceremony and confetti showdown!
- **🎮 Solo Challenge Mode:**
  - 3 lives survival mode.
  - Streak tracking with milestone celebratory fanfares.
- **🌍 Continent Filtering:**
  - Practice specific regions: Europe, Asia, Americas, Africa, Oceania, or All.
- **🔊 Synthesized Web Audio API:**
  - Built-in hardware audio effects for button clicks, correct guesses, wrong answers, streak fanfares, and game over.
  - No external audio files or internet audio requests needed; toggle sound anytime (`M` key or header button).
- **🎉 Physics Canvas Confetti:**
  - Custom particle confetti on winning PvP duels and high score streaks.
- **📖 Flag Encyclopedia & Study Gallery:**
  - Browse 197 countries with flags, capitals, and continents.
  - Live instant search.
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