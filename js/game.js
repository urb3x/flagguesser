// Flag Guesser — Typing-First with Autocorrect & 1v1 PvP Duel
(function () {
  // Levenshtein Distance for Fuzzy Autocorrect
  function levenshtein(a, b) {
    const an = a ? a.length : 0;
    const bn = b ? b.length : 0;
    if (an === 0) return bn;
    if (bn === 0) return an;
    const matrix = Array.from({ length: bn + 1 }, () => new Array(an + 1));
    for (let i = 0; i <= an; i++) matrix[0][i] = i;
    for (let j = 0; j <= bn; j++) matrix[j][0] = j;
    for (let j = 1; j <= bn; j++) {
      for (let i = 1; i <= an; i++) {
        if (b.charAt(j - 1) === a.charAt(i - 1)) {
          matrix[j][i] = matrix[j - 1][i - 1];
        } else {
          matrix[j][i] = Math.min(
            matrix[j - 1][i - 1] + 1, // substitution
            matrix[j][i - 1] + 1,     // insertion
            matrix[j - 1][i] + 1      // deletion
          );
        }
      }
    }
    return matrix[bn][an];
  }

  function cleanString(str) {
    return str.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
  }

  // Find country match with fuzzy autocorrect
  function findBestCountryMatch(rawInput) {
    const query = cleanString(rawInput);
    if (!query) return null;

    // 1. Exact match on name or aliases
    for (const c of COUNTRIES_DATA) {
      if (cleanString(c.name) === query) {
        return { country: c, isExact: true, autocorrected: false };
      }
      if (c.aliases) {
        for (const a of c.aliases) {
          if (cleanString(a) === query) {
            return { country: c, isExact: true, autocorrected: false };
          }
        }
      }
    }

    // 2. Fuzzy Levenshtein match across all countries and aliases
    let bestMatch = null;
    let minDistance = Infinity;

    for (const c of COUNTRIES_DATA) {
      const candidates = [c.name, ...(c.aliases || [])];
      for (const cand of candidates) {
        const cleanCand = cleanString(cand);
        const dist = levenshtein(query, cleanCand);
        
        // Allowed distance based on length of target name
        const maxAllowedDist = cleanCand.length <= 4 ? 1 : cleanCand.length <= 7 ? 2 : 3;

        if (dist <= maxAllowedDist && dist < minDistance) {
          minDistance = dist;
          bestMatch = {
            country: c,
            isExact: false,
            autocorrected: true,
            originalInput: rawInput.trim(),
            distance: dist
          };
        }
      }
    }

    return bestMatch;
  }

  // Game State
  const state = {
    gameMode: "solo", // "solo" or "pvp"
    currentCountry: null,
    usedCountryCodes: new Set(),
    selectedContinent: "all",
    isAnsweringLocked: false,
    feedbackTimeout: null,

    // Solo State
    solo: {
      score: 0,
      streak: 0,
      maxStreak: 0,
      lives: 3,
      maxLives: 3
    },

    // PvP State
    pvp: {
      totalRounds: 10,
      currentTurnIndex: 0, // 0 to totalRounds - 1
      activePlayer: 1,     // 1 or 2
      scoreP1: 0,
      scoreP2: 0
    },

    // Statistics
    stats: {
      played: 0,
      correct: 0,
      totalGuesses: 0,
      highScore: 0,
      bestStreak: 0
    }
  };

  // DOM Elements
  const dom = {
    playTab: document.getElementById("tab-play"),
    studyTab: document.getElementById("tab-study"),
    playView: document.getElementById("play-view"),
    studyView: document.getElementById("study-view"),
    brandHome: document.getElementById("brand-home"),

    soundBtn: document.getElementById("sound-btn"),
    statsBtn: document.getElementById("stats-btn"),
    closeStatsBtn: document.getElementById("close-stats-btn"),
    statsModal: document.getElementById("stats-modal"),
    resetStatsBtn: document.getElementById("reset-stats-btn"),
    shareStatsBtn: document.getElementById("share-stats-btn"),

    modeSolo: document.getElementById("mode-solo"),
    modePvp: document.getElementById("mode-pvp"),
    continentFilter: document.getElementById("continent-filter"),
    pvpRoundsSelect: document.getElementById("pvp-rounds-select"),

    // Solo HUD
    soloHud: document.getElementById("solo-hud"),
    hudScore: document.getElementById("hud-score"),
    hudStreak: document.getElementById("hud-streak"),
    hudLives: document.getElementById("hud-lives"),

    // PvP Scoreboard
    pvpScoreboard: document.getElementById("pvp-scoreboard"),
    pvpCardP1: document.getElementById("pvp-card-p1"),
    pvpScoreP1: document.getElementById("pvp-score-p1"),
    pvpBadgeP1: document.getElementById("pvp-badge-p1"),
    pvpCardP2: document.getElementById("pvp-card-p2"),
    pvpScoreP2: document.getElementById("pvp-score-p2"),
    pvpBadgeP2: document.getElementById("pvp-badge-p2"),
    pvpRoundText: document.getElementById("pvp-round-text"),
    turnBanner: document.getElementById("turn-banner"),

    // Game Arena
    gameCard: document.getElementById("game-card"),
    currentFlagImg: document.getElementById("current-flag-img"),
    feedbackBanner: document.getElementById("feedback-banner"),
    typeInput: document.getElementById("type-input"),
    typeSubmitBtn: document.getElementById("type-submit-btn"),
    autocompleteList: document.getElementById("autocomplete-list"),

    // Modals
    soloGameoverModal: document.getElementById("solo-gameover-modal"),
    soloFinalScore: document.getElementById("solo-final-score"),
    soloRoundStreak: document.getElementById("solo-round-streak"),
    soloPlayAgainBtn: document.getElementById("solo-play-again-btn"),

    pvpGameoverModal: document.getElementById("pvp-gameover-modal"),
    pvpWinnerTitle: document.getElementById("pvp-winner-title"),
    pvpWinnerSubtitle: document.getElementById("pvp-winner-subtitle"),
    pvpFinalP1: document.getElementById("pvp-final-p1"),
    pvpFinalP2: document.getElementById("pvp-final-p2"),
    pvpRematchBtn: document.getElementById("pvp-rematch-btn"),

    // Study
    studySearchInput: document.getElementById("study-search-input"),
    encyclopediaGrid: document.getElementById("encyclopedia-grid")
  };

  // --- STATS MANAGEMENT ---
  function loadStats() {
    const saved = localStorage.getItem("flagguesser_stats");
    if (saved) {
      try {
        state.stats = { ...state.stats, ...JSON.parse(saved) };
      } catch (e) {
        console.error("Could not parse stats", e);
      }
    }
    updateStatsModalUI();
  }

  function saveStats() {
    localStorage.setItem("flagguesser_stats", JSON.stringify(state.stats));
    updateStatsModalUI();
  }

  function updateStatsModalUI() {
    document.getElementById("stat-games-played").textContent = state.stats.played;
    document.getElementById("stat-high-score").textContent = state.stats.highScore;
    document.getElementById("stat-best-streak").textContent = state.stats.bestStreak;
    const accuracy = state.stats.totalGuesses > 0 
      ? Math.round((state.stats.correct / state.stats.totalGuesses) * 100) 
      : 0;
    document.getElementById("stat-accuracy").textContent = `${accuracy}%`;
  }

  function updateSoundButton() {
    dom.soundBtn.textContent = soundManager.isMuted() ? "🔇" : "🔊";
  }

  // --- POOL FILTERING & PICKING ---
  function getFilteredPool() {
    let pool = COUNTRIES_DATA;
    if (state.selectedContinent !== "all") {
      pool = COUNTRIES_DATA.filter(c => c.continent === state.selectedContinent);
    }
    return pool.length > 0 ? pool : COUNTRIES_DATA;
  }

  function pickNextFlag() {
    state.isAnsweringLocked = false;
    dom.typeInput.value = "";
    dom.typeInput.disabled = false;
    dom.autocompleteList.style.display = "none";
    dom.typeInput.focus();

    const pool = getFilteredPool();
    if (state.usedCountryCodes.size >= pool.length) {
      state.usedCountryCodes.clear();
    }

    const available = pool.filter(c => !state.usedCountryCodes.has(c.code));
    const targetPool = available.length > 0 ? available : pool;
    const target = targetPool[Math.floor(Math.random() * targetPool.length)];
    state.currentCountry = target;
    state.usedCountryCodes.add(target.code);

    // Update flag image
    dom.currentFlagImg.src = getFlagUrl(target.code, 320);
    dom.currentFlagImg.alt = "Mystery Flag";

    updateUIState();
  }

  function updateUIState() {
    if (state.gameMode === "solo") {
      dom.soloHud.style.display = "flex";
      dom.pvpScoreboard.style.display = "none";
      dom.turnBanner.style.display = "none";
      dom.pvpRoundsSelect.style.display = "none";

      dom.hudScore.textContent = state.solo.score;
      dom.hudStreak.textContent = `🔥 ${state.solo.streak}`;

      let hearts = "";
      for (let i = 0; i < state.solo.lives; i++) hearts += "❤️";
      for (let i = state.solo.lives; i < state.solo.maxLives; i++) hearts += "🖤";
      dom.hudLives.textContent = hearts;
    } else {
      // PvP Mode
      dom.soloHud.style.display = "none";
      dom.pvpScoreboard.style.display = "grid";
      dom.turnBanner.style.display = "block";
      dom.pvpRoundsSelect.style.display = "block";

      dom.pvpScoreP1.textContent = state.pvp.scoreP1;
      dom.pvpScoreP2.textContent = state.pvp.scoreP2;

      const roundNum = state.pvp.currentTurnIndex + 1;
      dom.pvpRoundText.textContent = `Flag ${roundNum} / ${state.pvp.totalRounds}`;

      if (state.pvp.activePlayer === 1) {
        dom.pvpCardP1.classList.add("active-turn");
        dom.pvpCardP2.classList.remove("active-turn");
        dom.pvpBadgeP1.textContent = "Your Turn";
        dom.pvpBadgeP2.textContent = "Waiting";

        dom.turnBanner.className = "turn-banner player-1";
        dom.turnBanner.textContent = `🔵 Player 1's Turn (Flag ${roundNum}/${state.pvp.totalRounds})`;
      } else {
        dom.pvpCardP2.classList.add("active-turn");
        dom.pvpCardP1.classList.remove("active-turn");
        dom.pvpBadgeP2.textContent = "Your Turn";
        dom.pvpBadgeP1.textContent = "Waiting";

        dom.turnBanner.className = "turn-banner player-2";
        dom.turnBanner.textContent = `🟠 Player 2's Turn (Flag ${roundNum}/${state.pvp.totalRounds})`;
      }
    }
  }

  // --- GUESS SUBMISSION & AUTOCORRECT LOGIC ---
  function submitGuess() {
    if (state.isAnsweringLocked) return;
    const rawGuess = dom.typeInput.value.trim();
    if (!rawGuess) return;

    state.isAnsweringLocked = true;
    dom.typeInput.disabled = true;
    state.stats.totalGuesses++;

    // Find best match with fuzzy autocorrect
    const match = findBestCountryMatch(rawGuess);
    const curr = state.currentCountry;

    const isCorrect = match && match.country.code === curr.code;

    if (isCorrect) {
      soundManager.playCorrect();
      dom.typeInput.classList.add("correct");

      let bannerText = `🎉 Correct: ${curr.name}! (+10 pts)`;
      if (match.autocorrected) {
        bannerText = `✨ Autocorrected: "${rawGuess}" ➔ ${curr.name}! (+10 pts)`;
      }
      showFeedback(bannerText, false);

      if (state.gameMode === "solo") {
        state.solo.score += 10;
        state.solo.streak += 1;
        state.stats.correct++;
        if (state.solo.streak > state.solo.maxStreak) state.solo.maxStreak = state.solo.streak;
        if (state.solo.streak > state.stats.bestStreak) state.stats.bestStreak = state.solo.streak;
        if (state.solo.score > state.stats.highScore) state.stats.highScore = state.solo.score;

        if (state.solo.streak >= 5 && state.solo.streak % 5 === 0) {
          soundManager.playStreak();
          confettiEngine.fire(80);
        }

        saveStats();
        updateUIState();

        setTimeout(() => {
          dom.typeInput.classList.remove("correct");
          pickNextFlag();
        }, 800);
      } else {
        // PvP Mode: Award points to active player
        if (state.pvp.activePlayer === 1) {
          state.pvp.scoreP1 += 10;
        } else {
          state.pvp.scoreP2 += 10;
        }
        updateUIState();

        setTimeout(() => {
          dom.typeInput.classList.remove("correct");
          advancePvpTurn();
        }, 900);
      }
    } else {
      // Incorrect answer
      soundManager.playWrong();
      dom.typeInput.classList.add("wrong");

      const bannerText = `❌ Incorrect! That was ${curr.name}.`;
      showFeedback(bannerText, true);

      if (state.gameMode === "solo") {
        state.solo.streak = 0;
        state.solo.lives -= 1;
        saveStats();
        updateUIState();

        if (state.solo.lives <= 0) {
          setTimeout(() => {
            dom.typeInput.classList.remove("wrong");
            endSoloGame();
          }, 1100);
        } else {
          setTimeout(() => {
            dom.typeInput.classList.remove("wrong");
            pickNextFlag();
          }, 1200);
        }
      } else {
        // PvP Mode: No points, advance turn
        setTimeout(() => {
          dom.typeInput.classList.remove("wrong");
          advancePvpTurn();
        }, 1200);
      }
    }
  }

  function advancePvpTurn() {
    state.pvp.currentTurnIndex++;

    if (state.pvp.currentTurnIndex >= state.pvp.totalRounds) {
      endPvpGame();
    } else {
      // Alternate between player 1 and player 2
      state.pvp.activePlayer = state.pvp.activePlayer === 1 ? 2 : 1;
      pickNextFlag();
    }
  }

  function showFeedback(text, isError = false) {
    clearTimeout(state.feedbackTimeout);
    dom.feedbackBanner.textContent = text;
    dom.feedbackBanner.className = isError 
      ? "autocorrect-banner wrong-banner" 
      : "autocorrect-banner";
    dom.feedbackBanner.style.display = "block";

    state.feedbackTimeout = setTimeout(() => {
      dom.feedbackBanner.style.display = "none";
    }, 2000);
  }

  // --- AUTOCOMPLETE SUGGESTIONS ---
  function handleAutocomplete() {
    const val = cleanString(dom.typeInput.value);
    if (val.length < 1) {
      dom.autocompleteList.style.display = "none";
      return;
    }

    const matches = COUNTRIES_DATA.filter(c => {
      const cleanN = cleanString(c.name);
      const aliasMatch = c.aliases && c.aliases.some(a => cleanString(a).includes(val));
      return cleanN.includes(val) || aliasMatch;
    }).slice(0, 5);

    if (matches.length === 0) {
      dom.autocompleteList.style.display = "none";
      return;
    }

    dom.autocompleteList.innerHTML = "";
    matches.forEach(c => {
      const item = document.createElement("div");
      item.className = "autocomplete-item";
      item.innerHTML = `
        <span>${c.name}</span>
        <span class="item-continent">🌍 ${c.continent}</span>
      `;
      item.addEventListener("click", () => {
        dom.typeInput.value = c.name;
        dom.autocompleteList.style.display = "none";
        submitGuess();
      });
      dom.autocompleteList.appendChild(item);
    });
    dom.autocompleteList.style.display = "block";
  }

  // --- GAME RESET & ENDINGS ---
  function resetGame() {
    state.usedCountryCodes.clear();

    if (state.gameMode === "solo") {
      state.solo.score = 0;
      state.solo.streak = 0;
      state.solo.lives = state.solo.maxLives;
    } else {
      state.pvp.scoreP1 = 0;
      state.pvp.scoreP2 = 0;
      state.pvp.currentTurnIndex = 0;
      state.pvp.activePlayer = 1;
    }

    dom.feedbackBanner.style.display = "none";
    pickNextFlag();
  }

  function endSoloGame() {
    soundManager.playGameOver();
    state.stats.played++;
    saveStats();

    dom.soloFinalScore.textContent = state.solo.score;
    dom.soloRoundStreak.textContent = state.solo.maxStreak;
    dom.soloGameoverModal.classList.add("active");

    if (state.solo.score >= 50) {
      confettiEngine.fire(90);
    }
  }

  function endPvpGame() {
    const p1 = state.pvp.scoreP1;
    const p2 = state.pvp.scoreP2;

    dom.pvpFinalP1.textContent = p1;
    dom.pvpFinalP2.textContent = p2;

    if (p1 > p2) {
      dom.pvpWinnerTitle.textContent = "👑 Player 1 Wins!";
      dom.pvpWinnerTitle.style.color = "var(--player-1)";
      dom.pvpWinnerSubtitle.textContent = `Player 1 wins with ${p1} points against ${p2} points!`;
    } else if (p2 > p1) {
      dom.pvpWinnerTitle.textContent = "👑 Player 2 Wins!";
      dom.pvpWinnerTitle.style.color = "var(--player-2)";
      dom.pvpWinnerSubtitle.textContent = `Player 2 wins with ${p2} points against ${p1} points!`;
    } else {
      dom.pvpWinnerTitle.textContent = "🤝 It's a Tie!";
      dom.pvpWinnerTitle.style.color = "#38bdf8";
      dom.pvpWinnerSubtitle.textContent = `Honorable draw! Both players scored ${p1} points!`;
    }

    soundManager.playStreak();
    confettiEngine.fire(110);
    dom.pvpGameoverModal.classList.add("active");
  }

  // --- ENCYCLOPEDIA ---
  function renderEncyclopedia(filterText = "") {
    dom.encyclopediaGrid.innerHTML = "";
    const term = filterText.toLowerCase().trim();

    const filtered = COUNTRIES_DATA.filter(c => {
      return (
        c.name.toLowerCase().includes(term) ||
        c.capital.toLowerCase().includes(term) ||
        c.continent.toLowerCase().includes(term)
      );
    });

    filtered.forEach(c => {
      const card = document.createElement("div");
      card.className = "encyclopedia-card";
      card.innerHTML = `
        <div class="thumb">
          <img src="${getFlagUrl(c.code, 320)}" alt="${c.name} Flag" loading="lazy">
        </div>
        <div class="info">
          <span class="name" title="${c.name}">${c.name}</span>
          <span class="capital">🏛️ ${c.capital}</span>
          <span style="font-size: 0.72rem; color: var(--text-dim); margin-top: 2px;">🌍 ${c.continent}</span>
        </div>
      `;
      dom.encyclopediaGrid.appendChild(card);
    });
  }

  // --- EVENT LISTENERS ---
  function setupEventListeners() {
    // Mode Switch: Solo vs PvP
    dom.modeSolo.addEventListener("click", () => {
      soundManager.playClick();
      dom.modeSolo.classList.add("active");
      dom.modePvp.classList.remove("active");
      state.gameMode = "solo";
      resetGame();
    });

    dom.modePvp.addEventListener("click", () => {
      soundManager.playClick();
      dom.modePvp.classList.add("active");
      dom.modeSolo.classList.remove("active");
      state.gameMode = "pvp";
      resetGame();
    });

    // PvP rounds setting
    dom.pvpRoundsSelect.addEventListener("change", (e) => {
      soundManager.playClick();
      state.pvp.totalRounds = parseInt(e.target.value, 10);
      resetGame();
    });

    // Continent Filter
    dom.continentFilter.addEventListener("change", (e) => {
      soundManager.playClick();
      state.selectedContinent = e.target.value;
      resetGame();
    });

    // Sound toggle
    dom.soundBtn.addEventListener("click", () => {
      soundManager.toggleMute();
      updateSoundButton();
      if (!soundManager.isMuted()) soundManager.playClick();
    });

    // Modals
    dom.statsBtn.addEventListener("click", () => {
      soundManager.playClick();
      dom.statsModal.classList.add("active");
    });

    dom.closeStatsBtn.addEventListener("click", () => {
      dom.statsModal.classList.remove("active");
    });

    dom.statsModal.addEventListener("click", (e) => {
      if (e.target === dom.statsModal) dom.statsModal.classList.remove("active");
    });

    dom.resetStatsBtn.addEventListener("click", () => {
      if (confirm("Are you sure you want to reset all your stats?")) {
        state.stats = { played: 0, correct: 0, totalGuesses: 0, highScore: 0, bestStreak: 0 };
        saveStats();
      }
    });

    dom.shareStatsBtn.addEventListener("click", () => {
      const text = `🚩 Flag Guesser Score: ${state.solo.score} pts | Best Streak: ${state.stats.bestStreak} 🔥\nPlay at: https://urb3x.github.io/flagguesser/`;
      navigator.clipboard.writeText(text).then(() => {
        alert("Score copied to clipboard! Share it with friends 🚀");
      }).catch(() => {
        prompt("Copy your score:", text);
      });
    });

    dom.soloPlayAgainBtn.addEventListener("click", () => {
      soundManager.playClick();
      dom.soloGameoverModal.classList.remove("active");
      resetGame();
    });

    dom.pvpRematchBtn.addEventListener("click", () => {
      soundManager.playClick();
      dom.pvpGameoverModal.classList.remove("active");
      resetGame();
    });

    // Navigation Tabs: Play vs Study
    dom.playTab.addEventListener("click", () => {
      soundManager.playClick();
      dom.playTab.classList.add("active");
      dom.studyTab.classList.remove("active");
      dom.playView.style.display = "flex";
      dom.studyView.style.display = "none";
    });

    dom.studyTab.addEventListener("click", () => {
      soundManager.playClick();
      dom.studyTab.classList.add("active");
      dom.playTab.classList.remove("active");
      dom.playView.style.display = "none";
      dom.studyView.style.display = "flex";
      renderEncyclopedia(dom.studySearchInput.value);
    });

    dom.brandHome.addEventListener("click", () => {
      dom.playTab.click();
    });

    // Input submission & Autocomplete
    dom.typeSubmitBtn.addEventListener("click", submitGuess);
    dom.typeInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        dom.autocompleteList.style.display = "none";
        submitGuess();
      }
    });
    dom.typeInput.addEventListener("input", handleAutocomplete);

    // Hide autocomplete on click outside
    document.addEventListener("click", (e) => {
      if (!dom.typeSection.contains(e.target)) {
        dom.autocompleteList.style.display = "none";
      }
    });

    // Search in encyclopedia
    dom.studySearchInput.addEventListener("input", (e) => {
      renderEncyclopedia(e.target.value);
    });

    // Keyboard shortcuts: M for mute, Esc to close modals
    window.addEventListener("keydown", (e) => {
      if (e.target.tagName === "INPUT" && e.key !== "Escape") return;

      if (e.key === "m" || e.key === "M") {
        dom.soundBtn.click();
      } else if (e.key === "Escape") {
        dom.statsModal.classList.remove("active");
        dom.soloGameoverModal.classList.remove("active");
        dom.pvpGameoverModal.classList.remove("active");
      }
    });
  }

  // --- INITIALIZE ---
  function init() {
    loadStats();
    updateSoundButton();
    setupEventListeners();
    resetGame();
    renderEncyclopedia();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
