const state = {
  players: [],
  drawPile: [],
  discardPile: [],
  currentPlayerIndex: 0,
  leadPlayerIndex: 0,
  lastPlayedBy: null,
  activeCard: null,
  activeElement: null,
  passCount: 0,
  pendingDraw: 0,
  chainElement: null,
  chainCount: 0,
  selectedCardId: null,
  winner: null,
  busy: false,
  waitingForWildChoice: false,
  waitingWildCardId: null
};

const hudEl = document.getElementById("hud");
const seatTopEl = document.getElementById("seat-top");
const seatLeftEl = document.getElementById("seat-left");
const seatRightEl = document.getElementById("seat-right");
const tableAreaEl = document.getElementById("tableArea");
const handAreaEl = document.getElementById("handArea");
const logAreaEl = document.getElementById("logArea");
const humanSummaryEl = document.getElementById("humanSummary");
const playBtn = document.getElementById("playBtn");
const passBtn = document.getElementById("passBtn");
const newGameBtn = document.getElementById("newGameBtn");
const wildChooserEl = document.getElementById("wildChooser");

function createPlayer(name, isAI) {
  return {
    name,
    isAI,
    hand: [],
    coins: 5,
    passed: false
  };
}

function addLog(text) {
  const entry = document.createElement("div");
  entry.className = "log-entry";
  entry.textContent = text;
  logAreaEl.prepend(entry);
}

function ensureDrawPile() {
  if (state.drawPile.length > 0) return;

  if (state.discardPile.length === 0) return;

  const activeId = state.activeCard ? state.activeCard.id : null;
  const recyclable = state.discardPile.filter(card => card.id !== activeId);

  if (recyclable.length === 0) return;

  state.drawPile = shuffle(recyclable);
  state.discardPile = [];
  addLog("Draw pile was reshuffled.");
}

function drawCards(player, count) {
  let drawn = 0;
  for (let i = 0; i < count; i++) {
    ensureDrawPile();
    const card = state.drawPile.pop();
    if (!card) break;
    player.hand.push(card);
    drawn++;
  }
  return drawn;
}

function cardText(card) {
  if (!card) return "None";

  if (card.kind === "normal") return `${card.element} ${card.value}`;
  if (card.kind === "plus2") return `+2 ${card.element}`;

  if (card.kind === "plus4") {
    return card.chosenElement
      ? `+4 Wild → ${card.chosenElement}`
      : "+4 Wild";
  }

  return "None";
}

function getEffectiveElement(card) {
  if (!card) return null;

  if (card.kind === "plus4") {
    return card.chosenElement || null;
  }

  return card.element;
}

function canPlayCard(card, activeCard) {
  if (!activeCard) return true;

  // +4 stacking
  if (activeCard.kind === "plus4") {
    if (state.pendingDraw > 0) {
      return card.kind === "plus4";
    }
  }

  // +2 stacking
  if (activeCard.kind === "plus2") {
    if (state.pendingDraw > 0) {
      return card.kind === "plus2";
    }
  }

  // +4 can always be played if no stack active
  if (card.kind === "plus4") return true;

  const targetElement = getEffectiveElement(activeCard);

  // +2 as attack card
  if (card.kind === "plus2") {
    return compareElements(card.element, targetElement) === "strong";
  }

  // normal cards
  if (card.kind === "normal") {
    return compareElements(card.element, targetElement) === "strong";
  }

  return false;
}

function getPlayableCards(player) {
  return player.hand.filter(card => canPlayCard(card, state.activeCard));
}

function removeCardFromHand(player, cardId) {
  const index = player.hand.findIndex(card => card.id === cardId);
  if (index === -1) return null;
  return player.hand.splice(index, 1)[0];
}

function resetPassFlags() {
  state.players.forEach(p => {
    p.passed = false;
  });
}

function applyCardEffects(card) {
  if (card.kind === "plus2") {
    state.pendingDraw = 2;
    state.activeElement = card.element;
    return;
  }

  if (card.kind === "plus4") {
    state.pendingDraw += 4;
    return;
  }

  state.pendingDraw = 0;
  state.activeElement = card.element;
}

function updateChain(card) {
  const element = card.kind === "plus4" ? null : card.element;

  if (!element) {
    state.chainElement = null;
    state.chainCount = 0;
    return;
  }

  if (state.chainElement === element) {
    state.chainCount += 1;
  } else {
    state.chainElement = element;
    state.chainCount = 1;
  }
}

function checkWinner(playerIndex) {
  const player = state.players[playerIndex];
  if (player.hand.length === 0) {
    state.winner = playerIndex;
    addLog(`${player.name} wins the game.`);
    render();
    return true;
  }
  return false;
}

function advanceTurn() {
  state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
}

function startFreshRound() {
  state.activeCard = null;
  state.activeElement = null;
  state.passCount = 0;
  state.pendingDraw = 0;
  state.chainElement = null;
  state.chainCount = 0;
  resetPassFlags();
  state.currentPlayerIndex = state.leadPlayerIndex;
  addLog(`${state.players[state.leadPlayerIndex].name} leads a new set.`);
}

function handleAllPasses() {
  if (state.lastPlayedBy == null) return;
  state.leadPlayerIndex = state.lastPlayedBy;
  startFreshRound();
}

function playCardForPlayer(playerIndex, cardId, chosenElement = null) {
  if (state.winner !== null) return false;

  const player = state.players[playerIndex];
  const card = player.hand.find(c => c.id === cardId);
  if (!card) return false;

  if (!canPlayCard(card, state.activeCard)) return false;

  const played = removeCardFromHand(player, cardId);

  if (played.kind === "plus4") {
    played.chosenElement = chosenElement || played.chosenElement || null;
    state.activeElement = played.chosenElement || null;
  } else {
    state.activeElement = played.element;
  }

  state.activeCard = played;
  state.discardPile.push(played);
  state.lastPlayedBy = playerIndex;
  state.leadPlayerIndex = playerIndex;
  state.passCount = 0;
  resetPassFlags();
  applyCardEffects(played);
  updateChain(played);

  if (played.kind === "plus4") {
    if (played.chosenElement) {
      addLog(`${player.name} played +4 Wild and chose ${played.chosenElement}.`);
    } else {
      addLog(`${player.name} played +4 Wild.`);
    }
  } else {
    addLog(`${player.name} played ${cardText(played)}.`);
  }

  if (checkWinner(playerIndex)) return true;

  advanceTurn();
  render();
  queueAIIfNeeded();
  return true;
}

function handlePass(playerIndex) {
  if (state.winner !== null) return;

  const player = state.players[playerIndex];

  let note = `${player.name} passed and lost 1 coin.`;
  player.coins = Math.max(0, player.coins - 1);
  player.passed = true;

  if (state.pendingDraw > 0) {
    const drawn = drawCards(player, state.pendingDraw);
    note += ` Drew ${drawn} card(s) from pending draw.`;

    state.pendingDraw = 0;
    state.chainElement = null;
    state.chainCount = 0;

    // IMPORTANT:
    // do NOT clear activeCard here
    // the center card remains visible
    // only round reset clears the table
  } else if (state.chainCount >= 3) {
    const drawn = drawCards(player, state.chainCount);
    note += ` Failed an elemental chain and drew ${drawn} card(s).`;
    state.chainElement = null;
    state.chainCount = 0;
  } else {
    const drawn = drawCards(player, 1);
    note += ` Drew ${drawn} card for passing.`;
  }

  state.passCount += 1;
  addLog(note);

  if (state.lastPlayedBy != null && state.passCount >= state.players.length - 1) {
    handleAllPasses();
    render();
    queueAIIfNeeded();
    return;
  }

  advanceTurn();
  render();
  queueAIIfNeeded();
}

function aiCardScore(card) {
  if (card.kind === "normal") return card.value;
  if (card.kind === "plus2") return 50;
  return 100;
}

function aiChooseCard(player) {
  const playable = getPlayableCards(player);
  if (playable.length === 0) return null;

  playable.sort((a, b) => aiCardScore(a) - aiCardScore(b));
  return playable[0];
}

function renderHud() {
  const current = state.players[state.currentPlayerIndex];
  const active = state.activeCard ? cardText(state.activeCard) : "None";

  hudEl.innerHTML = `
    <div class="hud-card">
      <div class="hud-label">Current Turn</div>
      <div class="hud-value">${current.name}</div>
    </div>
    <div class="hud-card">
      <div class="hud-label">Active Card</div>
      <div class="hud-value">${active}</div>
    </div>
    <div class="hud-card">
      <div class="hud-label">Active Element</div>
      <div class="hud-value">${state.activeElement || "None"}</div>
    </div>
    <div class="hud-card">
      <div class="hud-label">Draw Pile</div>
      <div class="hud-value">${state.drawPile.length}</div>
    </div>
    <div class="hud-card">
      <div class="hud-label">Pending Draw</div>
      <div class="hud-value">${state.pendingDraw}</div>
    </div>
  `;
}

function renderAICardBacks(count) {
  let html = `<div class="ai-fan">`;
  for (let i = 0; i < count; i++) {
    html += `<div class="ai-cardback"></div>`;
  }
  html += `</div>`;
  return html;
}

function renderSeat(playerIndex, mountEl, label) {
  const player = state.players[playerIndex];
  const playableCount = getPlayableCards(player).length;

  mountEl.innerHTML = `
    <div class="seat-box ${playerIndex === state.currentPlayerIndex ? "active" : ""} ${player.passed ? "passed" : ""}">
      <div class="seat-name">${player.name}</div>
      <p class="seat-sub">${label}</p>

      <div class="seat-stats">
        <div class="seat-stat">Cards<br><strong>${player.hand.length}</strong></div>
        <div class="seat-stat">Coins<br><strong>${player.coins}</strong></div>
        <div class="seat-stat">Status<br><strong>${player.passed ? "Passed" : "Ready"}</strong></div>
        <div class="seat-stat">Playable<br><strong>${playableCount}</strong></div>
      </div>

      ${renderAICardBacks(player.hand.length)}
    </div>
  `;
}

function renderTable() {
  if (state.winner !== null) {
    tableAreaEl.innerHTML = `
      <div class="empty">
        <strong>${state.players[state.winner].name}</strong> wins.<br>
        Press <strong>New Game</strong> to play again.
      </div>
    `;
    return;
  }

  const activeCardHtml = state.activeCard
    ? `
      <div class="table-card" style="background:${getCardGradient(state.activeCard)}">
        <div class="table-title">Current Active Card</div>
        <div class="table-name">${cardText(state.activeCard)}</div>
        <div class="table-big">${state.activeCard.kind === "normal" ? state.activeCard.value : state.activeCard.kind === "plus2" ? "+2" : "+4"}</div>
        <div class="table-title">Played by ${state.lastPlayedBy != null ? state.players[state.lastPlayedBy].name : "—"}</div>
      </div>
    `
    : `
      <div class="empty">No active card yet. Lead player may play any card.</div>
    `;

  const infoHtml = `
    <div class="table-card">
      <div class="table-title">Round Info</div>
      <div class="table-name">Lead: ${state.players[state.leadPlayerIndex].name}</div>
      <div class="table-big">${state.passCount}</div>
      <div class="table-title">Passes since last play</div>
    </div>
  `;

  tableAreaEl.innerHTML = `<div class="table-card-wrap">${activeCardHtml}${infoHtml}</div>`;
}

function renderHand() {
  const human = state.players[0];
  const humanTurn = state.currentPlayerIndex === 0;
  const selected = state.selectedCardId;

  humanSummaryEl.innerHTML = `
    <div class="summary-pill">Cards: ${human.hand.length}</div>
    <div class="summary-pill">Coins: ${human.coins}</div>
    <div class="summary-pill">${humanTurn ? "Your Turn" : "Waiting"}</div>
  `;

  handAreaEl.innerHTML = "";

  human.hand.forEach(card => {
    const playable = canPlayCard(card, state.activeCard);
    const div = document.createElement("div");
    div.className = "card";
    if (!humanTurn || !playable || state.winner !== null || state.waitingForWildChoice) {
      div.classList.add("disabled");
    }
    if (selected === card.id) div.classList.add("selected");

    div.style.background = getCardGradient(card);

    div.innerHTML = `
      <div class="card-top">
        <div>
          <div class="card-type">${card.kind}</div>
          <div class="card-name">
            ${card.name}
            ${card.kind === "plus4" ? `<span class="wild-rainbow">🌈</span>` : ""}
          </div>
        </div>
      </div>
      <div class="card-value">${
        card.kind === "normal" ? card.value : card.kind === "plus2" ? "+2" : "+4"
      }</div>
      <div class="card-meta">
        Element: ${card.element}<br>
        ${playable ? "Playable now" : "Not playable"}
      </div>
    `;

    div.addEventListener("click", () => {
      if (!humanTurn || !playable || state.winner !== null || state.waitingForWildChoice) return;
      state.selectedCardId = state.selectedCardId === card.id ? null : card.id;
      render();
    });

    handAreaEl.appendChild(div);
  });

  if (human.hand.length === 0) {
    handAreaEl.innerHTML = `<div class="empty">No cards left.</div>`;
  }

  playBtn.disabled = !(humanTurn && state.selectedCardId && state.winner === null && !state.waitingForWildChoice);
  passBtn.disabled = !(humanTurn && state.winner === null && !state.waitingForWildChoice);

  if (state.waitingForWildChoice) {
    wildChooserEl.classList.remove("hidden");
  } else {
    wildChooserEl.classList.add("hidden");
  }
}

function render() {
  renderHud();
  renderSeat(2, seatTopEl, "Player 3 · AI");
  renderSeat(1, seatLeftEl, "Player 2 · AI");
  renderSeat(3, seatRightEl, "Player 4 · AI");
  renderTable();
  renderHand();
}

function aiChooseBestElement(player) {
  const counts = {
    Fire: 0,
    Water: 0,
    Lightning: 0,
    Earth: 0,
    Wind: 0,
    Wood: 0
  };

  for (const card of player.hand) {
    if (card.element && counts[card.element] !== undefined) {
      counts[card.element] += 1;
    }
  }

  let best = "Fire";
  let max = -1;

  for (const element of Object.keys(counts)) {
    if (counts[element] > max) {
      max = counts[element];
      best = element;
    }
  }

  return best;
}

function queueAIIfNeeded() {
  if (state.winner !== null) return;
  if (state.busy) return;
  if (state.currentPlayerIndex === 0) return;

  state.busy = true;

  setTimeout(() => {
    if (state.winner !== null) {
      state.busy = false;
      return;
    }

    const aiIndex = state.currentPlayerIndex;
    const ai = state.players[aiIndex];
    const choice = aiChooseCard(ai);

    state.busy = false;

    if (choice) {
      if (choice.kind === "plus4") {
        const chosenElement = aiChooseBestElement(ai);
        playCardForPlayer(aiIndex, choice.id, chosenElement);
      } else {
        playCardForPlayer(aiIndex, choice.id);
      }
    } else {
      handlePass(aiIndex);
    }
  }, 850);
}

function newGame() {
  state.players = [
    createPlayer("Player 1", false),
    createPlayer("Player 2", true),
    createPlayer("Player 3", true),
    createPlayer("Player 4", true)
  ];

    state.drawPile = buildDeck();
    state.discardPile = [];
    state.currentPlayerIndex = 0;
    state.leadPlayerIndex = 0;
    state.lastPlayedBy = null;
    state.activeCard = null;
    state.activeElement = null;
    state.passCount = 0;
    state.pendingDraw = 0;
    state.chainElement = null;
    state.chainCount = 0;
    state.selectedCardId = null;
    state.winner = null;
    state.busy = false;
    state.waitingForWildChoice = false;
    state.waitingWildCardId = null;

  for (let i = 0; i < 7; i++) {
    state.players.forEach(player => {
      const card = state.drawPile.pop();
      if (card) player.hand.push(card);
    });
  }

  logAreaEl.innerHTML = "";
  addLog("New game started.");
  addLog("Each player was dealt 7 cards.");
  render();
}

playBtn.addEventListener("click", () => {
  if (state.currentPlayerIndex !== 0) return;
  if (!state.selectedCardId) return;

  const human = state.players[0];
  const selectedCard = human.hand.find(card => card.id === state.selectedCardId);
  if (!selectedCard) return;

  if (selectedCard.kind === "plus4") {
    state.waitingForWildChoice = true;
    render();
    return;
  }

  const selectedId = state.selectedCardId;
  state.selectedCardId = null;
  playCardForPlayer(0, selectedId);
});

passBtn.addEventListener("click", () => {
  if (state.currentPlayerIndex !== 0) return;
  state.selectedCardId = null;
  handlePass(0);
});

document.querySelectorAll("[data-wild-element]").forEach(btn => {
  btn.addEventListener("click", () => {
    if (!state.waitingForWildChoice) return;
    if (state.currentPlayerIndex !== 0) return;
    if (!state.selectedCardId) return;

    const chosenElement = btn.dataset.wildElement;
    const selectedId = state.selectedCardId;

    state.waitingForWildChoice = false;
    state.selectedCardId = null;

    playCardForPlayer(0, selectedId, chosenElement);
  });
});

newGameBtn.addEventListener("click", newGame);

newGame();