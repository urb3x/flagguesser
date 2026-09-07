// Flag Guesser — Typo-Tolerant Typing & 1v1 PvP Duel via 4-Digit Code
(function () {
  // Levenshtein distance to detect and forgive typos
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
            matrix[j - 1][i - 1] + 1,
            matrix[j][i - 1] + 1,
            matrix[j - 1][i] + 1
          );
        }
      }
    }
    return matrix[bn][an];
  }

  function cleanString(str) {
    return str ? str.toLowerCase().trim().replace(/[^a-z0-9]/g, "") : "";
  }

  // Check if query matches a country (exact or minor typo)
  function matchesCountry(query, country) {
    if (!query || query.length < 2) return false;
    const candidates = [country.name, ...(country.aliases || [])];

    for (const cand of candidates) {
      const cleanCand = cleanString(cand);
      if (cleanCand === query) return true;

      // Distance allowance for typos
      if (query.length >= 3) {
        const dist = levenshtein(query, cleanCand);
        const maxDist = cleanCand.length <= 4 ? 1 : cleanCand.length <= 7 ? 2 : 3;
        if (dist <= maxDist) return true;
      }
    }
    return false;
  }

  // Find if query matches ANY known country in the world
  function findAnyCountryMatch(rawInput) {
    const query = cleanString(rawInput);
    if (!query) return null;

    // 1. Check exact match
    for (const c of COUNTRIES_DATA) {
      if (cleanString(c.name) === query) return c;
      if (c.aliases && c.aliases.some(a => cleanString(a) === query)) return c;
    }

    // 2. Check typo match
    if (query.length >= 3) {
      let bestCountry = null;
      let minDistance = Infinity;

      for (const c of COUNTRIES_DATA) {
        const candidates = [c.name, ...(c.aliases || [])];
        for (const cand of candidates) {
          const cleanCand = cleanString(cand);
          const dist = levenshtein(query, cleanCand);
          const maxDist = cleanCand.length <= 4 ? 1 : cleanCand.length <= 7 ? 2 : 3;

          if (dist <= maxDist && dist < minDistance) {
            minDistance = dist;
            bestCountry = c;
          }
        }
      }
      return bestCountry;
    }

    return null;
  }

  // Application State
  const state = {
    gameMode: "solo",  // "solo", "pvp-lobby", "pvp-online", "pvp-local"
    currentCountry: null,
    usedCountryCodes: new Set(),
    selectedContinent: "all",
    isAnsweringLocked: false,
    feedbackTimeout: null,

    // Solo Mode
    solo: {
      score: 0,
      streak: 0,
      maxStreak: 0,
      lives: 3,
      maxLives: 3
    },

    // PvP State
    pvp: {
      isOnline: false,
      isHost: false,
      roomCode: null,
      flagSequence: [],
      currentTurnIndex: 0,
      totalRounds: 10,
      activePlayer: 1, // 1 or 2
      scoreP1: 0,
      scoreP2: 0,
      myPlayerNumber: 1
    },

    // Overall Stats
    stats: {
      played: 0,
      correct: 0,
      totalGuesses: 0,
      highScore: 0,
      bestStreak: 0
    }
  };

  let dom = {};

  function cacheDOMElements() {
    dom = {
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
      filterBar: document.getElementById("filter-bar"),

      // PvP Lobby
      pvpLobby: document.getElementById("pvp-lobby"),
      hostIdleSection: document.getElementById("host-idle-section"),
      hostActiveSection: document.getElementById("host-active-section"),
      createRoomBtn: document.getElementById("create-room-btn"),
      roomCodeDisplay: document.getElementById("room-code-display"),
      copyInviteBtn: document.getElementById("copy-invite-btn"),
      joinCodeInput: document.getElementById("join-code-input"),
      joinRoomBtn: document.getElementById("join-room-btn"),
      joinErrorMsg: document.getElementById("join-error-msg"),
      localDuelBtn: document.getElementById("local-duel-btn"),

      // PvP Scoreboard
      pvpScoreboard: document.getElementById("pvp-scoreboard"),
      pvpCardP1: document.getElementById("pvp-card-p1"),
      pvpNameP1: document.getElementById("pvp-name-p1"),
      pvpScoreP1: document.getElementById("pvp-score-p1"),
      pvpBadgeP1: document.getElementById("pvp-badge-p1"),
      pvpCardP2: document.getElementById("pvp-card-p2"),
      pvpNameP2: document.getElementById("pvp-name-p2"),
      pvpScoreP2: document.getElementById("pvp-score-p2"),
      pvpBadgeP2: document.getElementById("pvp-badge-p2"),
      pvpRoundText: document.getElementById("pvp-round-text"),
      turnBanner: document.getElementById("turn-banner"),

      // Solo HUD
      soloHud: document.getElementById("solo-hud"),
      hudScore: document.getElementById("hud-score"),
      hudStreak: document.getElementById("hud-streak"),
      hudLives: document.getElementById("hud-lives"),

      // Arena
      gameCard: document.getElementById("game-card"),
      currentFlagImg: document.getElementById("current-flag-img"),
      feedbackBanner: document.getElementById("feedback-banner"),
      typeInput: document.getElementById("type-input"),
      typeSubmitBtn: document.getElementById("type-submit-btn"),

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
      pvpLabelP1: document.getElementById("pvp-label-p1"),
      pvpLabelP2: document.getElementById("pvp-label-p2"),
      pvpRematchBtn: document.getElementById("pvp-rematch-btn"),
      pvpLeaveBtn: document.getElementById("pvp-leave-btn")
    };
  }

  // --- STATS ---
  function loadStats() {
    const saved = localStorage.getItem("flagguesser_stats");
    if (saved) {
      try {
        state.stats = { ...state.stats, ...JSON.parse(saved) };
      } catch (e) {}
    }
    updateStatsModalUI();
  }

  function saveStats() {
    localStorage.setItem("flagguesser_stats", JSON.stringify(state.stats));
    updateStatsModalUI();
  }

  function updateStatsModalUI() {
    const elPlayed = document.getElementById("stat-games-played");
    const elHigh = document.getElementById("stat-high-score");
    const elBest = document.getElementById("stat-best-streak");
    const elAcc = document.getElementById("stat-accuracy");

    if (elPlayed) elPlayed.textContent = state.stats.played;
    if (elHigh) elHigh.textContent = state.stats.highScore;
    if (elBest) elBest.textContent = state.stats.bestStreak;
    if (elAcc) {
      const acc = state.stats.totalGuesses > 0 
        ? Math.round((state.stats.correct / state.stats.totalGuesses) * 100) 
        : 0;
      elAcc.textContent = `${acc}%`;
    }
  }

  function updateSoundButton() {
    if (dom.soundBtn) {
      dom.soundBtn.textContent = soundManager.isMuted() ? "🔇" : "🔊";
    }
  }

  // --- POOL & FLAG PICKING ---
  function getFilteredPool() {
    let pool = COUNTRIES_DATA;
    if (state.selectedContinent !== "all") {
      pool = COUNTRIES_DATA.filter(c => c.continent === state.selectedContinent);
    }
    return pool.length > 0 ? pool : COUNTRIES_DATA;
  }

  function loadFlag(country) {
    state.currentCountry = country;
    state.isAnsweringLocked = false;
    dom.typeInput.value = "";
    dom.typeInput.disabled = false;
    dom.currentFlagImg.src = getFlagUrl(country.code, 320);
    dom.currentFlagImg.alt = "Flag to guess";

    if (state.gameMode === "solo" || 
        state.gameMode === "pvp-local" || 
        (state.gameMode === "pvp-online" && state.pvp.activePlayer === state.pvp.myPlayerNumber)) {
      setTimeout(() => dom.typeInput.focus(), 50);
    } else {
      dom.typeInput.disabled = true;
    }

    updateHUD();
  }

  function pickNextSoloFlag() {
    const pool = getFilteredPool();
    if (state.usedCountryCodes.size >= pool.length) {
      state.usedCountryCodes.clear();
    }
    const available = pool.filter(c => !state.usedCountryCodes.has(c.code));
    const targetPool = available.length > 0 ? available : pool;
    const target = targetPool[Math.floor(Math.random() * targetPool.length)];
    state.usedCountryCodes.add(target.code);

    loadFlag(target);
  }

  // --- HUD RENDERING ---
  function updateHUD() {
    if (state.gameMode === "solo") {
      dom.pvpLobby.style.display = "none";
      dom.pvpScoreboard.style.display = "none";
      dom.turnBanner.style.display = "none";
      dom.soloHud.style.display = "flex";
      dom.filterBar.style.display = "flex";
      dom.gameCard.style.display = "flex";

      dom.hudScore.textContent = state.solo.score;
      dom.hudStreak.textContent = `🔥 ${state.solo.streak}`;

      let hearts = "";
      for (let i = 0; i < state.solo.lives; i++) hearts += "❤️";
      for (let i = state.solo.lives; i < state.solo.maxLives; i++) hearts += "🖤";
      dom.hudLives.textContent = hearts;
    } else if (state.gameMode === "pvp-lobby") {
      dom.pvpLobby.style.display = "flex";
      dom.pvpScoreboard.style.display = "none";
      dom.turnBanner.style.display = "none";
      dom.soloHud.style.display = "none";
      dom.filterBar.style.display = "none";
      dom.gameCard.style.display = "none";
    } else {
      // Active PvP match (online or local)
      dom.pvpLobby.style.display = "none";
      dom.pvpScoreboard.style.display = "grid";
      dom.turnBanner.style.display = "block";
      dom.soloHud.style.display = "none";
      dom.filterBar.style.display = "none";
      dom.gameCard.style.display = "flex";

      dom.pvpScoreP1.textContent = state.pvp.scoreP1;
      dom.pvpScoreP2.textContent = state.pvp.scoreP2;

      const flagNum = state.pvp.currentTurnIndex + 1;
      dom.pvpRoundText.textContent = `Flag ${flagNum} / ${state.pvp.totalRounds}`;

      const isP1 = state.pvp.activePlayer === 1;
      dom.pvpCardP1.classList.toggle("active-turn", isP1);
      dom.pvpCardP2.classList.toggle("active-turn", !isP1);

      if (state.pvp.isOnline) {
        const isMyTurn = state.pvp.activePlayer === state.pvp.myPlayerNumber;
        dom.pvpBadgeP1.textContent = state.pvp.myPlayerNumber === 1 ? (isP1 ? "Your Turn" : "Waiting") : (isP1 ? "Their Turn" : "Waiting");
        dom.pvpBadgeP2.textContent = state.pvp.myPlayerNumber === 2 ? (!isP1 ? "Your Turn" : "Waiting") : (!isP1 ? "Their Turn" : "Waiting");

        if (isMyTurn) {
          dom.turnBanner.className = state.pvp.activePlayer === 1 ? "turn-banner player-1" : "turn-banner player-2";
          dom.turnBanner.textContent = `⚡ YOUR TURN (Flag ${flagNum}/${state.pvp.totalRounds}) — Type the country!`;
          dom.typeInput.disabled = false;
          dom.typeInput.placeholder = "Type country name...";
          dom.typeInput.focus();
        } else {
          dom.turnBanner.className = state.pvp.activePlayer === 1 ? "turn-banner player-1" : "turn-banner player-2";
          dom.turnBanner.textContent = `⏳ Opponent is guessing (Flag ${flagNum}/${state.pvp.totalRounds})...`;
          dom.typeInput.disabled = true;
          dom.typeInput.placeholder = "Opponent's turn to guess...";
        }
      } else {
        // Local duel
        dom.pvpBadgeP1.textContent = isP1 ? "Your Turn" : "Waiting";
        dom.pvpBadgeP2.textContent = !isP1 ? "Your Turn" : "Waiting";

        dom.turnBanner.className = isP1 ? "turn-banner player-1" : "turn-banner player-2";
        dom.turnBanner.textContent = isP1 
          ? `🔵 Player 1's Turn (Flag ${flagNum}/${state.pvp.totalRounds})`
          : `🟠 Player 2's Turn (Flag ${flagNum}/${state.pvp.totalRounds})`;
        dom.typeInput.disabled = false;
        dom.typeInput.focus();
      }
    }
  }

  // --- GUESS SUBMISSION (TYPOS COUNT AS GOOD ANSWER) ---
  function submitGuess() {
    if (state.isAnsweringLocked) return;
    const rawGuess = dom.typeInput.value.trim();
    if (!rawGuess) return;

    const query = cleanString(rawGuess);
    const curr = state.currentCountry;

    // 1. Check if the guess matches the CURRENT country (with typos accepted as good answer!)
    const isGoodAnswer = matchesCountry(query, curr);

    if (isGoodAnswer) {
      state.isAnsweringLocked = true;
      dom.typeInput.disabled = true;
      state.stats.totalGuesses++;

      soundManager.playCorrect();
      dom.typeInput.classList.add("correct");
      showFeedback(`🎉 Correct: ${curr.name}! (+10 pts)`, "correct");

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
        updateHUD();

        setTimeout(() => {
          dom.typeInput.classList.remove("correct");
          pickNextSoloFlag();
        }, 800);
      } else {
        // PvP Mode
        if (state.pvp.activePlayer === 1) {
          state.pvp.scoreP1 += 10;
        } else {
          state.pvp.scoreP2 += 10;
        }

        if (state.pvp.isOnline) {
          mpManager.send({
            type: "GUESS_RESULT",
            player: state.pvp.activePlayer,
            correct: true,
            scoreP1: state.pvp.scoreP1,
            scoreP2: state.pvp.scoreP2,
            countryName: curr.name,
            rawGuess: rawGuess
          });
        }

        updateHUD();

        setTimeout(() => {
          dom.typeInput.classList.remove("correct");
          advancePvpTurn();
        }, 850);
      }
      return;
    }

    // 2. It didn't match the current country. Check if what was typed is ANY real country at all:
    const otherCountry = findAnyCountryMatch(rawGuess);

    if (!otherCountry) {
      // It does not resemble ANY country in the world -> Invalid country (no penalty)
      soundManager.playTone(330, "sine", 0.12, 0, 0.1);
      dom.typeInput.classList.add("invalid");
      showFeedback(`⚠️ Invalid country! "${rawGuess}" does not exist.`, "invalid");

      setTimeout(() => {
        dom.typeInput.classList.remove("invalid");
        dom.typeInput.disabled = false;
        dom.typeInput.focus();
        dom.typeInput.select();
      }, 700);
      return;
    }

    // 3. It was a valid country, but the WRONG country for this flag -> Incorrect guess
    state.isAnsweringLocked = true;
    dom.typeInput.disabled = true;
    state.stats.totalGuesses++;

    soundManager.playWrong();
    dom.typeInput.classList.add("wrong");
    showFeedback(`❌ Incorrect! That was ${curr.name}.`, "wrong");

    if (state.gameMode === "solo") {
      state.solo.streak = 0;
      state.solo.lives -= 1;
      saveStats();
      updateHUD();

      if (state.solo.lives <= 0) {
        setTimeout(() => {
          dom.typeInput.classList.remove("wrong");
          endSoloGame();
        }, 1100);
      } else {
        setTimeout(() => {
          dom.typeInput.classList.remove("wrong");
          pickNextSoloFlag();
        }, 1200);
      }
    } else {
      // PvP Mode
      if (state.pvp.isOnline) {
        mpManager.send({
          type: "GUESS_RESULT",
          player: state.pvp.activePlayer,
          correct: false,
          scoreP1: state.pvp.scoreP1,
          scoreP2: state.pvp.scoreP2,
          countryName: curr.name
        });
      }

      setTimeout(() => {
        dom.typeInput.classList.remove("wrong");
        advancePvpTurn();
      }, 1200);
    }
  }

  function advancePvpTurn() {
    state.pvp.currentTurnIndex++;

    if (state.pvp.currentTurnIndex >= state.pvp.totalRounds) {
      endPvpGame();
    } else {
      state.pvp.activePlayer = state.pvp.activePlayer === 1 ? 2 : 1;
      const nextCode = state.pvp.flagSequence[state.pvp.currentTurnIndex];
      const nextCountry = COUNTRIES_DATA.find(c => c.code === nextCode);
      loadFlag(nextCountry);
    }
  }

  function showFeedback(text, type = "correct") {
    clearTimeout(state.feedbackTimeout);
    dom.feedbackBanner.textContent = text;
    if (type === "invalid") {
      dom.feedbackBanner.className = "autocorrect-banner invalid-banner";
    } else if (type === "wrong" || type === true) {
      dom.feedbackBanner.className = "autocorrect-banner wrong-banner";
    } else {
      dom.feedbackBanner.className = "autocorrect-banner";
    }
    dom.feedbackBanner.style.display = "block";

    state.feedbackTimeout = setTimeout(() => {
      dom.feedbackBanner.style.display = "none";
    }, 2200);
  }

  // --- PVP ONLINE MANAGEMENT (4-Digit Room Code) ---
  function generateFlagSequence(length = 10) {
    const shuffled = [...COUNTRIES_DATA];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, length).map(c => c.code);
  }

  function display4DigitCode(code) {
    const digits = code.split("");
    dom.roomCodeDisplay.innerHTML = "";
    digits.forEach(d => {
      const span = document.createElement("span");
      span.className = "code-digit";
      span.textContent = d;
      dom.roomCodeDisplay.appendChild(span);
    });
  }

  function hostCreateRoom() {
    soundManager.playClick();
    dom.createRoomBtn.disabled = true;
    dom.createRoomBtn.textContent = "Creating Room...";

    mpManager.createRoom(
      // onCreated
      (code) => {
        state.pvp.roomCode = code;
        state.pvp.isHost = true;
        state.pvp.myPlayerNumber = 1;
        dom.hostIdleSection.style.display = "none";
        dom.hostActiveSection.style.display = "flex";
        display4DigitCode(code);
      },
      // onOpponentJoined
      () => {
        soundManager.playStreak();
        const seq = generateFlagSequence(10);
        state.pvp.isOnline = true;
        state.pvp.flagSequence = seq;
        state.pvp.totalRounds = seq.length;
        state.pvp.currentTurnIndex = 0;
        state.pvp.activePlayer = 1;
        state.pvp.scoreP1 = 0;
        state.pvp.scoreP2 = 0;

        mpManager.send({
          type: "START_MATCH",
          flagSequence: seq,
          totalRounds: seq.length
        });

        startPvpMatch();
      },
      // onData
      handleNetworkData,
      // onError
      (err) => {
        alert("Host error: " + err);
        dom.createRoomBtn.disabled = false;
        dom.createRoomBtn.textContent = "Create 4-Digit Room 🚀";
        dom.hostIdleSection.style.display = "block";
        dom.hostActiveSection.style.display = "none";
      },
      // onDisconnect
      handleOpponentDisconnect
    );
  }

  function joinExistingRoom(code) {
    if (!code || code.length !== 4) {
      dom.joinErrorMsg.textContent = "Please enter a valid 4-digit code!";
      dom.joinErrorMsg.style.display = "block";
      return;
    }
    soundManager.playClick();
    dom.joinErrorMsg.style.display = "none";
    dom.joinRoomBtn.disabled = true;
    dom.joinRoomBtn.textContent = "Connecting...";

    mpManager.joinRoom(
      code,
      // onConnected
      () => {
        soundManager.playStreak();
        state.pvp.isOnline = true;
        state.pvp.isHost = false;
        state.pvp.myPlayerNumber = 2;
        state.pvp.roomCode = code;
      },
      // onData
      handleNetworkData,
      // onError
      (err) => {
        dom.joinErrorMsg.textContent = err || "Could not find room with this code.";
        dom.joinErrorMsg.style.display = "block";
        dom.joinRoomBtn.disabled = false;
        dom.joinRoomBtn.textContent = "Join Match ➔";
      },
      // onDisconnect
      handleOpponentDisconnect
    );
  }

  function handleNetworkData(data) {
    if (data.type === "START_MATCH") {
      state.pvp.isOnline = true;
      state.pvp.flagSequence = data.flagSequence;
      state.pvp.totalRounds = data.totalRounds;
      state.pvp.currentTurnIndex = 0;
      state.pvp.activePlayer = 1;
      state.pvp.scoreP1 = 0;
      state.pvp.scoreP2 = 0;
      startPvpMatch();
    } else if (data.type === "GUESS_RESULT") {
      state.pvp.scoreP1 = data.scoreP1;
      state.pvp.scoreP2 = data.scoreP2;

      if (data.correct) {
        soundManager.playCorrect();
        showFeedback(`Player ${data.player} got ${data.countryName}! (+10 pts)`, "correct");
      } else {
        soundManager.playWrong();
        showFeedback(`Player ${data.player} missed! (Answer: ${data.countryName})`, "wrong");
      }

      setTimeout(() => {
        advancePvpTurn();
      }, 1000);
    } else if (data.type === "REMATCH") {
      dom.pvpGameoverModal.classList.remove("active");
      if (state.pvp.isHost) {
        const seq = generateFlagSequence(10);
        state.pvp.flagSequence = seq;
        state.pvp.totalRounds = seq.length;
        state.pvp.currentTurnIndex = 0;
        state.pvp.activePlayer = 1;
        state.pvp.scoreP1 = 0;
        state.pvp.scoreP2 = 0;

        mpManager.send({
          type: "START_MATCH",
          flagSequence: seq,
          totalRounds: seq.length
        });
        startPvpMatch();
      }
    }
  }

  function handleOpponentDisconnect() {
    alert("Your opponent has disconnected from the room.");
    state.gameMode = "pvp-lobby";
    updateHUD();
  }

  function startPvpMatch() {
    state.gameMode = state.pvp.isOnline ? "pvp-online" : "pvp-local";
    const firstCode = state.pvp.flagSequence[0];
    const firstCountry = COUNTRIES_DATA.find(c => c.code === firstCode);
    loadFlag(firstCountry);
  }

  function startLocalDuel() {
    soundManager.playClick();
    state.pvp.isOnline = false;
    state.pvp.flagSequence = generateFlagSequence(10);
    state.pvp.totalRounds = 10;
    state.pvp.currentTurnIndex = 0;
    state.pvp.activePlayer = 1;
    state.pvp.scoreP1 = 0;
    state.pvp.scoreP2 = 0;
    startPvpMatch();
  }

  // --- GAME ENDINGS ---
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

    if (state.pvp.isOnline) {
      dom.pvpLabelP1.textContent = state.pvp.myPlayerNumber === 1 ? "🔵 You (P1)" : "🔵 Opponent (P1)";
      dom.pvpLabelP2.textContent = state.pvp.myPlayerNumber === 2 ? "🟠 You (P2)" : "🟠 Opponent (P2)";
    } else {
      dom.pvpLabelP1.textContent = "🔵 Player 1 Score";
      dom.pvpLabelP2.textContent = "🟠 Player 2 Score";
    }

    if (p1 > p2) {
      dom.pvpWinnerTitle.textContent = state.pvp.isOnline && state.pvp.myPlayerNumber === 1 ? "👑 VICTORY! You Won!" : "👑 Player 1 Wins!";
      dom.pvpWinnerTitle.style.color = "var(--player-1)";
      dom.pvpWinnerSubtitle.textContent = `P1 crushed it with ${p1} points vs ${p2} points!`;
    } else if (p2 > p1) {
      dom.pvpWinnerTitle.textContent = state.pvp.isOnline && state.pvp.myPlayerNumber === 2 ? "👑 VICTORY! You Won!" : "👑 Player 2 Wins!";
      dom.pvpWinnerTitle.style.color = "var(--player-2)";
      dom.pvpWinnerSubtitle.textContent = `P2 crushed it with ${p2} points vs ${p1} points!`;
    } else {
      dom.pvpWinnerTitle.textContent = "🤝 It's a Tie!";
      dom.pvpWinnerTitle.style.color = "#38bdf8";
      dom.pvpWinnerSubtitle.textContent = `Honorable draw! Both players scored ${p1} points!`;
    }

    soundManager.playStreak();
    confettiEngine.fire(110);
    dom.pvpGameoverModal.classList.add("active");
  }

  // --- EVENT LISTENERS ---
  function setupEventListeners() {
    // Mode Switching
    dom.modeSolo.addEventListener("click", () => {
      soundManager.playClick();
      dom.modeSolo.classList.add("active");
      dom.modePvp.classList.remove("active");
      state.gameMode = "solo";
      state.solo.score = 0;
      state.solo.streak = 0;
      state.solo.lives = state.solo.maxLives;
      pickNextSoloFlag();
    });

    dom.modePvp.addEventListener("click", () => {
      soundManager.playClick();
      dom.modePvp.classList.add("active");
      dom.modeSolo.classList.remove("active");
      state.gameMode = "pvp-lobby";
      updateHUD();
    });

    // PvP Lobby Actions
    dom.createRoomBtn.addEventListener("click", hostCreateRoom);

    dom.joinRoomBtn.addEventListener("click", () => {
      joinExistingRoom(dom.joinCodeInput.value.trim());
    });

    dom.joinCodeInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        joinExistingRoom(dom.joinCodeInput.value.trim());
      }
    });

    dom.copyInviteBtn.addEventListener("click", () => {
      const url = `${window.location.origin}${window.location.pathname}?room=${state.pvp.roomCode}`;
      navigator.clipboard.writeText(url).then(() => {
        alert(`Invite link copied to clipboard!\nSend this link or the 4-digit code (${state.pvp.roomCode}) to your friend!`);
      }).catch(() => {
        prompt("Copy invite link:", url);
      });
    });

    dom.localDuelBtn.addEventListener("click", startLocalDuel);

    // Rematch & Leave
    dom.pvpRematchBtn.addEventListener("click", () => {
      soundManager.playClick();
      dom.pvpGameoverModal.classList.remove("active");
      if (state.pvp.isOnline) {
        mpManager.send({ type: "REMATCH" });
        if (state.pvp.isHost) {
          const seq = generateFlagSequence(10);
          state.pvp.flagSequence = seq;
          state.pvp.totalRounds = seq.length;
          state.pvp.currentTurnIndex = 0;
          state.pvp.activePlayer = 1;
          state.pvp.scoreP1 = 0;
          state.pvp.scoreP2 = 0;

          mpManager.send({
            type: "START_MATCH",
            flagSequence: seq,
            totalRounds: seq.length
          });
          startPvpMatch();
        }
      } else {
        startLocalDuel();
      }
    });

    dom.pvpLeaveBtn.addEventListener("click", () => {
      soundManager.playClick();
      dom.pvpGameoverModal.classList.remove("active");
      mpManager.close();
      state.gameMode = "pvp-lobby";
      updateHUD();
    });

    // Continent Filter in Solo
    dom.continentFilter.addEventListener("change", (e) => {
      soundManager.playClick();
      state.selectedContinent = e.target.value;
      state.usedCountryCodes.clear();
      pickNextSoloFlag();
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
      state.solo.score = 0;
      state.solo.streak = 0;
      state.solo.lives = state.solo.maxLives;
      pickNextSoloFlag();
    });

    dom.brandHome.addEventListener("click", () => {
      dom.modeSolo.click();
    });

    // Input submission
    dom.typeSubmitBtn.addEventListener("click", submitGuess);
    dom.typeInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        submitGuess();
      }
    });

    // Keyboard Shortcuts
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

  // --- INITIALIZATION ---
  function init() {
    cacheDOMElements();
    loadStats();
    updateSoundButton();
    setupEventListeners();

    // Check URL parameters for invite code (?room=1234 or ?duel=1234)
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get("room") || urlParams.get("duel");

    if (roomParam && roomParam.length === 4) {
      dom.modePvp.click();
      dom.joinCodeInput.value = roomParam;
      setTimeout(() => {
        joinExistingRoom(roomParam);
      }, 300);
    } else {
      // Default: start Solo game
      pickNextSoloFlag();
    }
  }

  // Robust initialization
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
