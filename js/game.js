// Flag Guesser Main Game Logic
(function () {
  // Game State
  const state = {
    mode: "choice", // "choice", "reverse", "type", "timeattack"
    currentCountry: null,
    options: [],
    score: 0,
    streak: 0,
    maxStreak: 0,
    lives: 3,
    maxLives: 3,
    timeLeft: 60,
    timerInterval: null,
    activePool: [...COUNTRIES_DATA],
    usedCountryCodes: new Set(),
    isAnsweringLocked: false,
    selectedContinent: "all",
    selectedDifficulty: "all",
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
    
    gameoverModal: document.getElementById("gameover-modal"),
    gameoverTitle: document.getElementById("gameover-title"),
    gameoverFinalScore: document.getElementById("gameover-final-score"),
    gameoverRoundStreak: document.getElementById("gameover-round-streak"),
    playAgainBtn: document.getElementById("play-again-btn"),

    modeChips: document.querySelectorAll(".mode-chip"),
    continentFilter: document.getElementById("continent-filter"),
    difficultyFilter: document.getElementById("difficulty-filter"),

    hudScore: document.getElementById("hud-score"),
    hudStreak: document.getElementById("hud-streak"),
    hudLives: document.getElementById("hud-lives"),
    hudLivesContainer: document.getElementById("hud-lives-container"),
    hudTimer: document.getElementById("hud-timer"),
    hudTimerContainer: document.getElementById("hud-timer-container"),
    timeBarContainer: document.getElementById("time-bar-container"),
    timeBar: document.getElementById("time-bar"),

    gameCard: document.getElementById("game-card"),
    flagStage: document.getElementById("flag-stage"),
    currentFlagImg: document.getElementById("current-flag-img"),
    reversePromptBox: document.getElementById("reverse-prompt-box"),
    reverseCountryName: document.getElementById("reverse-country-name"),
    reverseSubHint: document.getElementById("reverse-sub-hint"),

    choiceOptionsGrid: document.getElementById("choice-options-grid"),
    reverseCardsGrid: document.getElementById("reverse-cards-grid"),
    typeSection: document.getElementById("type-section"),
    typeInput: document.getElementById("type-input"),
    typeSubmitBtn: document.getElementById("type-submit-btn"),
    autocompleteList: document.getElementById("autocomplete-list"),

    hint5050: document.getElementById("hint-5050"),
    hintCapital: document.getElementById("hint-capital"),
    hintLetter: document.getElementById("hint-letter"),
    skipBtn: document.getElementById("skip-btn"),
    hintMessageBox: document.getElementById("hint-message-box"),

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

  // --- SOUND TOGGLE ---
  function updateSoundButton() {
    dom.soundBtn.textContent = soundManager.isMuted() ? "🔇" : "🔊";
  }

  // --- POOL FILTERING ---
  function updateActivePool() {
    state.activePool = COUNTRIES_DATA.filter((item) => {
      const matchContinent = state.selectedContinent === "all" || item.continent === state.selectedContinent;
      const matchDifficulty = state.selectedDifficulty === "all" || item.difficulty === state.selectedDifficulty;
      return matchContinent && matchDifficulty;
    });

    if (state.activePool.length < 4) {
      // Fallback if combination is too small
      state.activePool = COUNTRIES_DATA.filter(
        item => state.selectedContinent === "all" || item.continent === state.selectedContinent
      );
    }
  }

  // --- NEW ROUND & QUESTION GENERATION ---
  function pickNextQuestion() {
    state.isAnsweringLocked = false;
    dom.hintMessageBox.style.display = "none";
    dom.hintMessageBox.textContent = "";
    dom.hint5050.disabled = false;
    dom.hintCapital.disabled = false;
    dom.hintLetter.disabled = false;

    if (state.usedCountryCodes.size >= state.activePool.length) {
      state.usedCountryCodes.clear();
    }

    const available = state.activePool.filter(c => !state.usedCountryCodes.has(c.code));
    const targetPool = available.length > 0 ? available : state.activePool;
    const target = targetPool[Math.floor(Math.random() * targetPool.length)];
    state.currentCountry = target;
    state.usedCountryCodes.add(target.code);

    // Pick 3 distractors
    const otherCountries = COUNTRIES_DATA.filter(c => c.code !== target.code);
    shuffleArray(otherCountries);
    const distractors = otherCountries.slice(0, 3);

    state.options = shuffleArray([target, ...distractors]);

    renderRoundUI();
  }

  function renderRoundUI() {
    const { currentCountry, options, mode } = state;

    // Reset view elements
    dom.flagStage.style.display = mode === "reverse" ? "none" : "flex";
    dom.reversePromptBox.style.display = mode === "reverse" ? "block" : "none";
    dom.choiceOptionsGrid.style.display = (mode === "choice" || mode === "timeattack") ? "grid" : "none";
    dom.reverseCardsGrid.style.display = mode === "reverse" ? "grid" : "none";
    dom.typeSection.style.display = mode === "type" ? "flex" : "none";

    // 50/50 only makes sense with multiple choices
    dom.hint5050.style.display = (mode === "choice" || mode === "reverse" || mode === "timeattack") ? "inline-flex" : "none";

    // Preload & set main flag image
    if (mode !== "reverse") {
      dom.currentFlagImg.src = getFlagUrl(currentCountry.code);
      dom.currentFlagImg.alt = `Flag of ${currentCountry.name}`;
    }

    // Set Reverse Mode prompt
    if (mode === "reverse") {
      dom.reverseCountryName.textContent = currentCountry.name;
      dom.reverseSubHint.textContent = `Capital: ${currentCountry.capital} • ${currentCountry.continent}`;
    }

    // Render Choice Mode Options
    if (mode === "choice" || mode === "timeattack") {
      dom.choiceOptionsGrid.innerHTML = "";
      options.forEach((opt, idx) => {
        const btn = document.createElement("button");
        btn.className = "option-btn";
        btn.innerHTML = `
          <span>${opt.name}</span>
          <span class="key-tag">${idx + 1}</span>
        `;
        btn.addEventListener("click", () => handleAnswer(opt, btn));
        dom.choiceOptionsGrid.appendChild(btn);
      });
    }

    // Render Reverse Mode Cards
    if (mode === "reverse") {
      dom.reverseCardsGrid.innerHTML = "";
      options.forEach((opt, idx) => {
        const card = document.createElement("div");
        card.className = "flag-choice-card";
        card.innerHTML = `
          <div class="thumb">
            <img src="${getFlagUrl(opt.code)}" alt="Flag choice ${idx + 1}">
          </div>
          <span style="font-weight: 700; font-size: 0.85rem; color: var(--text-muted);">Option ${idx + 1}</span>
        `;
        card.addEventListener("click", () => handleAnswer(opt, card));
        dom.reverseCardsGrid.appendChild(card);
      });
    }

    // Render Type Mode
    if (mode === "type") {
      dom.typeInput.value = "";
      dom.autocompleteList.style.display = "none";
      dom.typeInput.focus();
    }

    updateHUD();
  }

  // --- ANSWER HANDLING ---
  function handleAnswer(selectedOption, element) {
    if (state.isAnsweringLocked) return;
    state.isAnsweringLocked = true;
    state.stats.totalGuesses++;

    const isCorrect = selectedOption.code === state.currentCountry.code;

    if (isCorrect) {
      soundManager.playCorrect();
      if (element) element.classList.add("correct");

      state.score += 10;
      state.streak += 1;
      state.stats.correct++;
      if (state.streak > state.maxStreak) state.maxStreak = state.streak;
      if (state.streak > state.stats.bestStreak) state.stats.bestStreak = state.streak;
      if (state.score > state.stats.highScore) state.stats.highScore = state.score;

      // Celebrate streaks
      if (state.streak >= 5 && state.streak % 5 === 0) {
        soundManager.playStreak();
        confettiEngine.fire(80);
      }

      saveStats();
      updateHUD();

      setTimeout(() => {
        pickNextQuestion();
      }, 700);
    } else {
      soundManager.playWrong();
      if (element) element.classList.add("wrong");

      // Highlight correct answer in choice / reverse mode
      highlightCorrectAnswer();

      state.streak = 0;

      if (state.mode !== "timeattack") {
        state.lives -= 1;
      }

      saveStats();
      updateHUD();

      if (state.mode !== "timeattack" && state.lives <= 0) {
        setTimeout(() => {
          endGame("No more lives left! 💀");
        }, 1000);
      } else {
        setTimeout(() => {
          pickNextQuestion();
        }, 1100);
      }
    }
  }

  function highlightCorrectAnswer() {
    if (state.mode === "choice" || state.mode === "timeattack") {
      const buttons = dom.choiceOptionsGrid.querySelectorAll(".option-btn");
      buttons.forEach((btn, idx) => {
        if (state.options[idx].code === state.currentCountry.code) {
          btn.classList.add("correct");
        }
      });
    } else if (state.mode === "reverse") {
      const cards = dom.reverseCardsGrid.querySelectorAll(".flag-choice-card");
      cards.forEach((card, idx) => {
        if (state.options[idx].code === state.currentCountry.code) {
          card.classList.add("correct");
        }
      });
    }
  }

  // --- TYPE GUESS LOGIC ---
  function submitTypeGuess() {
    if (state.isAnsweringLocked) return;
    const guess = dom.typeInput.value.trim().toLowerCase();
    if (!guess) return;

    const curr = state.currentCountry;
    const directMatch = curr.name.toLowerCase() === guess;
    const aliasMatch = curr.aliases && curr.aliases.some(a => a.toLowerCase() === guess);

    const isMatch = directMatch || aliasMatch;

    if (isMatch) {
      handleAnswer(curr, dom.typeInput);
      dom.typeInput.classList.add("correct");
      setTimeout(() => dom.typeInput.classList.remove("correct"), 700);
    } else {
      handleAnswer({ code: "incorrect" }, dom.typeInput);
      dom.typeInput.classList.add("wrong");
      showHintMessage(`Incorrect! That was the flag of ${curr.name}.`);
      setTimeout(() => dom.typeInput.classList.remove("wrong"), 1000);
    }
  }

  function handleTypeAutocomplete() {
    const val = dom.typeInput.value.trim().toLowerCase();
    if (val.length < 1) {
      dom.autocompleteList.style.display = "none";
      return;
    }

    const matches = COUNTRIES_DATA.filter(c => 
      c.name.toLowerCase().includes(val) || 
      (c.aliases && c.aliases.some(a => a.toLowerCase().includes(val)))
    ).slice(0, 5);

    if (matches.length === 0) {
      dom.autocompleteList.style.display = "none";
      return;
    }

    dom.autocompleteList.innerHTML = "";
    matches.forEach(c => {
      const item = document.createElement("div");
      item.className = "autocomplete-item";
      item.innerHTML = `<span>${c.name}</span><span style="color: var(--text-dim); font-size: 0.8rem;">${c.continent}</span>`;
      item.addEventListener("click", () => {
        dom.typeInput.value = c.name;
        dom.autocompleteList.style.display = "none";
        submitTypeGuess();
      });
      dom.autocompleteList.appendChild(item);
    });
    dom.autocompleteList.style.display = "block";
  }

  // --- HINTS ---
  function apply5050Hint() {
    if (dom.hint5050.disabled || state.isAnsweringLocked) return;
    soundManager.playClick();
    dom.hint5050.disabled = true;

    if (state.mode === "choice" || state.mode === "timeattack") {
      const buttons = Array.from(dom.choiceOptionsGrid.querySelectorAll(".option-btn"));
      const wrongIndices = [];
      state.options.forEach((opt, idx) => {
        if (opt.code !== state.currentCountry.code) {
          wrongIndices.push(idx);
        }
      });
      shuffleArray(wrongIndices);
      // Disable two wrong options
      wrongIndices.slice(0, 2).forEach(idx => {
        buttons[idx].classList.add("disabled-50");
      });
    } else if (state.mode === "reverse") {
      const cards = Array.from(dom.reverseCardsGrid.querySelectorAll(".flag-choice-card"));
      const wrongIndices = [];
      state.options.forEach((opt, idx) => {
        if (opt.code !== state.currentCountry.code) {
          wrongIndices.push(idx);
        }
      });
      shuffleArray(wrongIndices);
      wrongIndices.slice(0, 2).forEach(idx => {
        cards[idx].style.opacity = "0.2";
        cards[idx].classList.add("disabled");
      });
    }
  }

  function applyCapitalHint() {
    if (dom.hintCapital.disabled || state.isAnsweringLocked) return;
    soundManager.playClick();
    dom.hintCapital.disabled = true;
    showHintMessage(`🏛️ Capital City: ${state.currentCountry.capital}`);
  }

  function applyLetterHint() {
    if (dom.hintLetter.disabled || state.isAnsweringLocked) return;
    soundManager.playClick();
    dom.hintLetter.disabled = true;
    const name = state.currentCountry.name;
    showHintMessage(`🔤 Starts with: "${name.charAt(0)}" • Length: ${name.length} letters`);
  }

  function applySkip() {
    if (state.isAnsweringLocked) return;
    soundManager.playClick();
    if (state.mode !== "timeattack") {
      state.lives--;
    }
    state.streak = 0;
    updateHUD();

    if (state.mode !== "timeattack" && state.lives <= 0) {
      endGame("Out of lives after skip!");
    } else {
      pickNextQuestion();
    }
  }

  function showHintMessage(text) {
    dom.hintMessageBox.textContent = text;
    dom.hintMessageBox.style.display = "block";
  }

  // --- TIME ATTACK ENGINE ---
  function startTimeAttack() {
    clearInterval(state.timerInterval);
    state.timeLeft = 60;
    dom.hudTimer.textContent = `${state.timeLeft}s`;
    dom.timeBar.style.width = "100%";

    state.timerInterval = setInterval(() => {
      state.timeLeft--;
      dom.hudTimer.textContent = `${state.timeLeft}s`;
      const pct = (state.timeLeft / 60) * 100;
      dom.timeBar.style.width = `${Math.max(0, pct)}%`;

      if (state.timeLeft <= 0) {
        clearInterval(state.timerInterval);
        endGame("Time is Up! ⏰");
      }
    }, 1000);
  }

  // --- HUD UPDATES ---
  function updateHUD() {
    dom.hudScore.textContent = state.score;
    dom.hudStreak.textContent = `🔥 ${state.streak}`;

    if (state.mode === "timeattack") {
      dom.hudLivesContainer.style.display = "none";
      dom.hudTimerContainer.style.display = "flex";
      dom.timeBarContainer.style.display = "block";
    } else {
      dom.hudLivesContainer.style.display = "flex";
      dom.hudTimerContainer.style.display = "none";
      dom.timeBarContainer.style.display = "none";
      
      let hearts = "";
      for (let i = 0; i < state.lives; i++) hearts += "❤️";
      for (let i = state.lives; i < state.maxLives; i++) hearts += "🖤";
      dom.hudLives.textContent = hearts;
    }
  }

  // --- GAME RESET & END ---
  function resetGame() {
    clearInterval(state.timerInterval);
    state.score = 0;
    state.streak = 0;
    state.lives = state.maxLives;
    state.usedCountryCodes.clear();

    if (state.mode === "timeattack") {
      startTimeAttack();
    }

    pickNextQuestion();
  }

  function endGame(title) {
    clearInterval(state.timerInterval);
    soundManager.playGameOver();

    state.stats.played++;
    saveStats();

    dom.gameoverTitle.textContent = title;
    dom.gameoverFinalScore.textContent = state.score;
    dom.gameoverRoundStreak.textContent = state.maxStreak;
    dom.gameoverModal.classList.add("active");

    if (state.score > 50) {
      confettiEngine.fire(90);
    }
  }

  // --- ENCYCLOPEDIA / STUDY MODE ---
  function renderEncyclopedia(filterText = "") {
    dom.encyclopediaGrid.innerHTML = "";
    const term = filterText.toLowerCase();

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
          <img src="${getFlagUrl(c.code)}" alt="${c.name} Flag" loading="lazy">
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

  // --- HELPER UTILITIES ---
  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  // --- EVENT LISTENERS ---
  function setupEventListeners() {
    // Mode switcher
    dom.modeChips.forEach(chip => {
      chip.addEventListener("click", () => {
        soundManager.playClick();
        dom.modeChips.forEach(c => c.classList.remove("active"));
        chip.classList.add("active");
        state.mode = chip.dataset.mode;
        resetGame();
      });
    });

    // Filters
    dom.continentFilter.addEventListener("change", (e) => {
      soundManager.playClick();
      state.selectedContinent = e.target.value;
      updateActivePool();
      resetGame();
    });

    dom.difficultyFilter.addEventListener("change", (e) => {
      soundManager.playClick();
      state.selectedDifficulty = e.target.value;
      updateActivePool();
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
      const text = `🚩 Flag Guesser Score: ${state.score} pts | Best Streak: ${state.stats.bestStreak} 🔥\nPlay at: https://urb3x.github.io/flagguesser/`;
      navigator.clipboard.writeText(text).then(() => {
        alert("Score copied to clipboard! Share it with friends 🚀");
      }).catch(() => {
        prompt("Copy your score:", text);
      });
    });

    dom.playAgainBtn.addEventListener("click", () => {
      soundManager.playClick();
      dom.gameoverModal.classList.remove("active");
      resetGame();
    });

    // Tab Navigation: Play vs Study
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

    // Hints
    dom.hint5050.addEventListener("click", apply5050Hint);
    dom.hintCapital.addEventListener("click", applyCapitalHint);
    dom.hintLetter.addEventListener("click", applyLetterHint);
    dom.skipBtn.addEventListener("click", applySkip);

    // Type input
    dom.typeSubmitBtn.addEventListener("click", submitTypeGuess);
    dom.typeInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        submitTypeGuess();
      }
    });
    dom.typeInput.addEventListener("input", handleTypeAutocomplete);

    // Study search
    dom.studySearchInput.addEventListener("input", (e) => {
      renderEncyclopedia(e.target.value);
    });

    // Global keyboard shortcuts (1-4 for options, M for mute, Esc for modals)
    window.addEventListener("keydown", (e) => {
      if (e.target.tagName === "INPUT") return;

      if (e.key >= "1" && e.key <= "4") {
        const idx = parseInt(e.key, 10) - 1;
        if (state.mode === "choice" || state.mode === "timeattack") {
          const btns = dom.choiceOptionsGrid.querySelectorAll(".option-btn");
          if (btns[idx] && !btns[idx].classList.contains("disabled-50")) {
            btns[idx].click();
          }
        } else if (state.mode === "reverse") {
          const cards = dom.reverseCardsGrid.querySelectorAll(".flag-choice-card");
          if (cards[idx]) {
            cards[idx].click();
          }
        }
      } else if (e.key === "m" || e.key === "M") {
        dom.soundBtn.click();
      } else if (e.key === "Escape") {
        dom.statsModal.classList.remove("active");
        dom.gameoverModal.classList.remove("active");
      }
    });
  }

  // --- INITIALIZATION ---
  function init() {
    loadStats();
    updateSoundButton();
    updateActivePool();
    setupEventListeners();
    resetGame();
    renderEncyclopedia();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
