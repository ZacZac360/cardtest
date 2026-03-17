const seatTopEl = document.getElementById("seat-top");
const seatLeftEl = document.getElementById("seat-left");
const seatRightEl = document.getElementById("seat-right");
const tableAreaEl = document.getElementById("tableArea");
const handAreaEl = document.getElementById("handArea");
const logAreaEl = document.getElementById("logArea");
const humanSummaryEl = document.getElementById("humanSummary");

const playerNameInput = document.getElementById("playerNameInput");
const joinBtn = document.getElementById("joinBtn");
const refreshBtn = document.getElementById("refreshBtn");
const resetRoomBtn = document.getElementById("resetRoomBtn");
const startGameBtn = document.getElementById("startGameBtn");
const playBtn = document.getElementById("playBtn");
const passBtn = document.getElementById("passBtn");
const wildChooserEl = document.getElementById("wildChooser");

const joinMsgEl = document.getElementById("joinMsg");
const actionMsgEl = document.getElementById("actionMsg");
const roomStatusValueEl = document.getElementById("roomStatusValue");
const roomModeValueEl = document.getElementById("roomModeValue");
const turnValueEl = document.getElementById("turnValue");
const meValueEl = document.getElementById("meValue");

let latestState = null;
let selectedCardId = null;
let pendingPlus4CardId = null;
let busy = false;

function getSeatByNo(seatNo) {
  return (latestState?.seats || []).find((s) => s && s.seat_no === seatNo) || null;
}

function addLocalMsg(el, text) {
  el.textContent = text || "";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function setBusy(nextBusy) {
  busy = !!nextBusy;
  const locked = busy;
  joinBtn.disabled = locked;
  refreshBtn.disabled = locked;
  startGameBtn.disabled = locked;
  playBtn.disabled = locked;
  passBtn.disabled = locked;
  resetRoomBtn.disabled = locked;
}

async function postJson(url, payload = {}) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  let data = {};
  try {
    data = await res.json();
  } catch (err) {
    data = { ok: false, msg: "Invalid server response." };
  }

  if (!res.ok || !data.ok) {
    throw new Error(data.msg || "Request failed.");
  }

  return data;
}

async function fetchState() {
  const res = await fetch("api/state.php", { cache: "no-store" });
  const data = await res.json();

  if (!data.ok) {
    throw new Error(data.msg || "Failed to fetch state.");
  }

  latestState = data;

  const myHand = latestState?.me?.hand || [];
  if (selectedCardId && !myHand.find((c) => c.id === selectedCardId)) {
    selectedCardId = null;
  }

  if (pendingPlus4CardId && !myHand.find((c) => c.id === pendingPlus4CardId)) {
    pendingPlus4CardId = null;
    wildChooserEl.classList.add("hidden");
  }

  render();
}

function seatLabel(seatNo) {
  return `Seat ${seatNo}`;
}

function seatRoleText(seat) {
  if (!seat?.occupied) return "Empty";
  return seat.player_type === "ai" ? "AI" : "Human";
}

function compareElements(challenger, defender) {
  if (!challenger || !defender) return "neutral";
  if (challenger === "Wild" || defender === "Wild") return "neutral";
  if (STRONG_AGAINST[challenger] === defender) return "strong";
  if (STRONG_AGAINST[defender] === challenger) return "weak";
  return "neutral";
}

function getEffectiveElement(card) {
  if (!card) return null;
  if (card.kind === "plus4") return card.chosenElement || null;
  return card.element || null;
}

function cardText(card) {
  if (!card) return "None";
  if (card.kind === "normal") return `${card.element} ${card.value}`;
  if (card.kind === "plus2") return `+2 ${card.element}`;
  if (card.kind === "plus4") {
    return card.chosenElement ? `+4 Wild → ${card.chosenElement}` : "+4 Wild";
  }
  return card.name || "Card";
}

function cardValueText(card) {
  if (!card) return "—";
  if (card.kind === "normal") return String(card.value ?? "—");
  if (card.kind === "plus2") return "+2";
  if (card.kind === "plus4") return "+4";
  return "—";
}

function canPlayCard(card, activeCard, pendingDraw) {
  if (!activeCard) return true;

  if (activeCard.kind === "plus4" && pendingDraw > 0) {
    return card.kind === "plus4";
  }

  if (activeCard.kind === "plus2" && pendingDraw > 0) {
    return card.kind === "plus2";
  }

  if (card.kind === "plus4") {
    return true;
  }

  const targetElement = getEffectiveElement(activeCard);

  if (card.kind === "plus2" || card.kind === "normal") {
    return compareElements(card.element, targetElement) === "strong";
  }

  return false;
}

function getPlayableCards(hand, room) {
  const activeCard = room?.active_card || null;
  const pendingDraw = Number(room?.pending_draw || 0);
  return (hand || []).filter((card) => canPlayCard(card, activeCard, pendingDraw));
}

function getCardById(cardId) {
  const hand = latestState?.me?.hand || [];
  return hand.find((card) => card.id === cardId) || null;
}

function cardIsPlayable(card) {
  const room = latestState?.room;
  const me = latestState?.me;

  if (!room || room.status !== "playing") return false;
  if (!me) return false;
  if (room.current_turn_seat !== me.seat_no) return false;

  return canPlayCard(card, room.active_card || null, Number(room.pending_draw || 0));
}

function getTurnHint() {
  const room = latestState?.room;
  const me = latestState?.me;
  if (!room || !me) return "";

  if (room.status === "waiting") {
    return "Waiting for host to start.";
  }

  if (room.status === "finished") {
    return room.winner_seat === me.seat_no ? "You won." : "Game finished.";
  }

  if (room.current_turn_seat !== me.seat_no) {
    return "Wait for your turn.";
  }

  const playable = getPlayableCards(me.hand || [], room);
  const pendingDraw = Number(room.pending_draw || 0);

  if (pendingDraw > 0) {
    if (playable.length > 0) {
      return `Stack with ${room.active_card?.kind === "plus4" ? "+4" : "+2"} or pass and draw ${pendingDraw}.`;
    }
    return `No valid stack. You must pass and draw ${pendingDraw}.`;
  }

  if (playable.length > 0) {
    return `${playable.length} playable card(s). Passing is still allowed.`;
  }

  return "No stronger element available. You must pass, unless using +4.";
}

function renderAICardBacks(count) {
  let html = `<div class="ai-fan">`;
  for (let i = 0; i < count; i++) {
    html += `<div class="ai-cardback"></div>`;
  }
  html += `</div>`;
  return html;
}

function renderSeat(mountEl, seatNo) {
  const seat = getSeatByNo(seatNo);
  const room = latestState?.room;
  const isTurn = room?.current_turn_seat === seatNo;

  if (!seat || !seat.occupied) {
    mountEl.innerHTML = `
      <div class="seat-box seat-box--open">
        <div class="seat-topbar">
          <div>
            <div class="seat-name">Open Seat</div>
            <p class="seat-sub">${seatLabel(seatNo)}</p>
          </div>
        </div>

        <div class="seat-stats">
          <div class="seat-stat">Type<strong>Empty</strong></div>
          <div class="seat-stat">Cards<strong>-</strong></div>
          <div class="seat-stat">Status<strong>Waiting</strong></div>
          <div class="seat-stat">Role<strong>Open</strong></div>
        </div>
      </div>
    `;
    return;
  }

  const badges = [];
  if (seat.is_me) badges.push(`<span class="seat-badge you">You</span>`);
  if (seat.is_host) badges.push(`<span class="seat-badge host">Host</span>`);
  if (isTurn) badges.push(`<span class="seat-badge turn">Turn</span>`);

  mountEl.innerHTML = `
    <div class="seat-box ${seat.is_me ? "active" : ""} ${isTurn ? "seat-turn" : ""}">
      <div class="seat-topbar">
        <div>
          <div class="seat-name">${escapeHtml(seat.player_name)}</div>
          <p class="seat-sub">${seatLabel(seatNo)} · ${escapeHtml(seatRoleText(seat))}</p>
        </div>
        <div class="seat-badges">${badges.join("")}</div>
      </div>

      <div class="seat-stats">
        <div class="seat-stat">Cards<strong>${seat.card_count}</strong></div>
        <div class="seat-stat">Role<strong>${escapeHtml(seatRoleText(seat))}</strong></div>
        <div class="seat-stat">Seat<strong>${seatNo}</strong></div>
        <div class="seat-stat">State<strong>${isTurn ? "Acting" : "Ready"}</strong></div>
      </div>

      ${seat.player_type === "ai" ? renderAICardBacks(Number(seat.card_count || 0)) : ""}
    </div>
  `;
}

function renderHudAndSummary() {
  const room = latestState?.room;
  const me = latestState?.me;

  if (!room) return;

  roomStatusValueEl.textContent = room.status;
  roomModeValueEl.textContent = `${room.max_players} Players`;

  const turnSeat = room.current_turn_seat;
  const turnSeatData = turnSeat ? getSeatByNo(turnSeat) : null;
  turnValueEl.textContent = turnSeatData?.player_name || "-";

  meValueEl.textContent = me ? `${me.player_name} (Seat ${me.seat_no})` : "Not Joined";

  const playableCount = me ? getPlayableCards(me.hand || [], room).length : 0;
  const activeCard = room.active_card ? cardText(room.active_card) : "None";

  humanSummaryEl.innerHTML = `
    <div class="summary-pill">Mode ${room.max_players}P</div>
    <div class="summary-pill">Pending ${room.pending_draw}</div>
    <div class="summary-pill">Playable ${playableCount}</div>
    <div class="summary-pill">Active ${escapeHtml(activeCard)}</div>
    <div class="summary-pill">${escapeHtml(getTurnHint() || "Shared room state")}</div>
  `;
}

function renderCenterCard(card) {
  if (!card) {
    return `
      <div class="card-face card-face--empty">
        <div class="card-face__corner">
          <div class="card-face__kind">EMPTY</div>
          <div class="card-face__title">No active card</div>
        </div>
        <div class="card-face__value">—</div>
        <div class="card-face__footer">
          <span>Lead may play anything</span>
          <span>Table clear</span>
        </div>
      </div>
    `;
  }

  return `
    <div class="card-face" style="background:${getCardGradient(card)};">
      <div class="card-face__corner">
        <div class="card-face__kind">${escapeHtml(card.kind.toUpperCase())}</div>
        <div class="card-face__title">${escapeHtml(cardText(card))}</div>
      </div>
      <div class="card-face__value">${escapeHtml(cardValueText(card))}</div>
      <div class="card-face__footer">
        <span>${escapeHtml(card.element || card.chosenElement || "Wild")}</span>
        <span>${escapeHtml(getEffectiveElement(card) || "Unset")}</span>
      </div>
    </div>
  `;
}

function renderTable() {
  const room = latestState?.room;
  if (!room) return;

  const activeCard = room.active_card || null;
  const winnerSeat = room.winner_seat;
  const winnerData = winnerSeat ? getSeatByNo(winnerSeat) : null;
  const leadData = room.lead_seat ? getSeatByNo(room.lead_seat) : null;
  const turnData = room.current_turn_seat ? getSeatByNo(room.current_turn_seat) : null;

  const statusTitle = winnerData
    ? `${winnerData.player_name} Wins`
    : room.status === "waiting"
      ? "Waiting"
      : room.status === "playing"
        ? "In Play"
        : room.status.toUpperCase();

  tableAreaEl.innerHTML = `
    <div class="board-center">
      <div class="board-ring"></div>

      <div class="board-meta">
        <div class="meta-pill">Status: ${escapeHtml(statusTitle)}</div>
        <div class="meta-pill">Element: ${escapeHtml(room.active_element || "None")}</div>
        <div class="meta-pill">Pending Draw: ${room.pending_draw}</div>
        <div class="meta-pill">Passes: ${room.pass_count || 0}</div>
      </div>

      <div class="center-stage">
        <div>
          <div class="stack-label">Draw Pile</div>
          <div class="deck-stack">
            <div class="deck-stack__inner">DECK</div>
          </div>
        </div>

        ${renderCenterCard(activeCard)}

        <div class="board-state">
          <div>
            <div class="board-state__kicker">Match State</div>
            <div class="board-state__title">${escapeHtml(statusTitle)}</div>
          </div>

          <div>
            <div class="board-state__line">Lead: ${escapeHtml(leadData?.player_name || "-")}</div>
            <div class="board-state__line">Turn: ${escapeHtml(turnData?.player_name || "-")}</div>
            <div class="board-state__line">Element: ${escapeHtml(room.active_element || "None")}</div>
            <div class="board-state__line">Passes: ${room.pass_count || 0}</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderHand() {
  const room = latestState?.room;
  const me = latestState?.me;

  if (!me) {
    handAreaEl.innerHTML = `<div class="empty">Join the room first.</div>`;
    return;
  }

  if (!room || room.status === "waiting") {
    handAreaEl.innerHTML = `<div class="empty">Waiting room. Host can start once ready.</div>`;
    return;
  }

  const myHand = me.hand || [];
  if (!myHand.length) {
    handAreaEl.innerHTML = `<div class="empty">No cards left.</div>`;
    return;
  }

  handAreaEl.innerHTML = myHand.map((card) => {
    const selected = selectedCardId === card.id ? "selected-card" : "";
    const playable = cardIsPlayable(card);
    const disabled = playable ? "" : "is-unplayable";
    const statusClass = playable ? "ok" : "no";
    const statusText = playable ? "Playable" : "Cannot play now";

    return `
      <button
        type="button"
        class="hand-card ${selected} ${disabled}"
        data-card-id="${escapeHtml(card.id)}"
        data-playable="${playable ? "1" : "0"}"
        style="background:${getCardGradient(card)};"
      >
        <div class="hand-card__top">
          <div class="hand-card__kind">${escapeHtml(card.kind.toUpperCase())}</div>
          <div class="hand-card__value">${escapeHtml(cardValueText(card))}</div>
        </div>

        <div class="hand-card__name">${escapeHtml(cardText(card))}</div>
        <div class="hand-card__meta">${escapeHtml(card.element || card.chosenElement || "Wild")}</div>
        <div class="hand-card__status ${statusClass}">${escapeHtml(statusText)}</div>
      </button>
    `;
  }).join("");

  handAreaEl.querySelectorAll("[data-card-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const cardId = btn.dataset.cardId;
      if (!cardId) return;

      selectedCardId = selectedCardId === cardId ? null : cardId;
      pendingPlus4CardId = null;
      wildChooserEl.classList.add("hidden");
      renderHand();
      updateControls();

      const card = getCardById(cardId);
      if (!card) return;

      if (!cardIsPlayable(card)) {
        addLocalMsg(actionMsgEl, "That card is grayed out because it cannot be played right now.");
      } else {
        addLocalMsg(actionMsgEl, `Selected ${cardText(card)}.`);
      }
    });
  });
}

function renderLogs() {
  const logs = latestState?.logs || [];
  if (!logs.length) {
    logAreaEl.innerHTML = `<div class="empty">No log entries yet.</div>`;
    return;
  }

  logAreaEl.innerHTML = [...logs]
    .reverse()
    .map((entry) => `<div class="log-entry">${escapeHtml(entry)}</div>`)
    .join("");
}

function updateModeButtons() {
  const currentMode = String(latestState?.room?.max_players || "4");
  document.querySelectorAll("[data-mode]").forEach((btn) => {
    btn.classList.toggle("selected", btn.dataset.mode === currentMode);
  });
}

function updateControls() {
  const room = latestState?.room;
  const me = latestState?.me;
  const selectedCard = selectedCardId ? getCardById(selectedCardId) : null;
  const myTurn = !!(room && me && room.status === "playing" && room.current_turn_seat === me.seat_no);
  const canPlaySelected = !!(selectedCard && cardIsPlayable(selectedCard));
  const waitingForWild = !!(
    selectedCard &&
    selectedCard.kind === "plus4" &&
    canPlaySelected &&
    pendingPlus4CardId === selectedCard.id
  );

  joinBtn.disabled = busy;
  refreshBtn.disabled = busy;
  resetRoomBtn.disabled = busy || !room?.is_host;
  startGameBtn.disabled = busy || !room?.is_host || room?.status !== "waiting";
  passBtn.disabled = busy || !myTurn;
  playBtn.disabled = busy || !myTurn || !selectedCard || !canPlaySelected || waitingForWild;

  if (!selectedCard || selectedCard.kind !== "plus4" || !canPlaySelected) {
    wildChooserEl.classList.add("hidden");
    pendingPlus4CardId = null;
  }
}

function render() {
  renderSeat(seatTopEl, 3);
  renderSeat(seatLeftEl, 2);
  renderSeat(seatRightEl, 4);
  renderHudAndSummary();
  renderTable();
  renderHand();
  renderLogs();
  updateModeButtons();
  updateControls();
}

document.querySelectorAll("[data-mode]").forEach((btn) => {
  btn.addEventListener("click", async () => {
    if (busy) return;

    try {
      setBusy(true);
      await postJson("api/update-room.php", { max_players: Number(btn.dataset.mode || 4) });
      addLocalMsg(actionMsgEl, `Room mode set to ${btn.dataset.mode} players.`);
      await fetchState();
    } catch (err) {
      addLocalMsg(actionMsgEl, err.message);
    } finally {
      setBusy(false);
      updateControls();
    }
  });
});

joinBtn.addEventListener("click", async () => {
  const playerName = playerNameInput.value.trim();
  if (!playerName) {
    addLocalMsg(joinMsgEl, "Enter your player name first.");
    return;
  }

  try {
    setBusy(true);
    const data = await postJson("api/join.php", { player_name: playerName });
    addLocalMsg(joinMsgEl, data.msg || "Joined room.");
    addLocalMsg(actionMsgEl, "");
    await fetchState();
  } catch (err) {
    addLocalMsg(joinMsgEl, err.message);
  } finally {
    setBusy(false);
    updateControls();
  }
});

refreshBtn.addEventListener("click", async () => {
  try {
    setBusy(true);
    await fetchState();
    addLocalMsg(actionMsgEl, "Refreshed.");
  } catch (err) {
    addLocalMsg(actionMsgEl, err.message);
  } finally {
    setBusy(false);
    updateControls();
  }
});

startGameBtn.addEventListener("click", async () => {
  try {
    setBusy(true);
    await postJson("api/start-game.php", {});
    addLocalMsg(actionMsgEl, "Game started.");
    selectedCardId = null;
    pendingPlus4CardId = null;
    wildChooserEl.classList.add("hidden");
    await fetchState();
  } catch (err) {
    addLocalMsg(actionMsgEl, err.message);
  } finally {
    setBusy(false);
    updateControls();
  }
});

playBtn.addEventListener("click", async () => {
  const card = selectedCardId ? getCardById(selectedCardId) : null;
  if (!card) {
    addLocalMsg(actionMsgEl, "Select a card first.");
    return;
  }

  if (!cardIsPlayable(card)) {
    addLocalMsg(actionMsgEl, "That selected card cannot be played right now.");
    return;
  }

  if (card.kind === "plus4") {
    pendingPlus4CardId = card.id;
    wildChooserEl.classList.remove("hidden");
    updateControls();
    addLocalMsg(actionMsgEl, "Choose an element for +4.");
    return;
  }

  try {
    setBusy(true);
    await postJson("api/play.php", { card_id: selectedCardId });
    addLocalMsg(actionMsgEl, "Card played.");
    selectedCardId = null;
    await fetchState();
  } catch (err) {
    addLocalMsg(actionMsgEl, err.message);
  } finally {
    setBusy(false);
    updateControls();
  }
});

passBtn.addEventListener("click", async () => {
  try {
    setBusy(true);
    await postJson("api/pass.php", {});
    addLocalMsg(actionMsgEl, "Turn passed.");
    selectedCardId = null;
    pendingPlus4CardId = null;
    wildChooserEl.classList.add("hidden");
    await fetchState();
  } catch (err) {
    addLocalMsg(actionMsgEl, err.message);
  } finally {
    setBusy(false);
    updateControls();
  }
});

resetRoomBtn.addEventListener("click", async () => {
  try {
    setBusy(true);
    const data = await postJson("api/reset-room.php", {});
    addLocalMsg(actionMsgEl, data.msg || "Room reset.");
    playerNameInput.value = "";
    selectedCardId = null;
    pendingPlus4CardId = null;
    latestState = null;
    wildChooserEl.classList.add("hidden");
    await fetchState();
  } catch (err) {
    addLocalMsg(actionMsgEl, err.message);
  } finally {
    setBusy(false);
    updateControls();
  }
});

wildChooserEl.querySelectorAll("[data-wild-element]").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const chosenElement = btn.dataset.wildElement;
    const card = pendingPlus4CardId ? getCardById(pendingPlus4CardId) : null;
    if (!card || !chosenElement) return;

    if (!cardIsPlayable(card)) {
      addLocalMsg(actionMsgEl, "That +4 cannot be played right now.");
      wildChooserEl.classList.add("hidden");
      pendingPlus4CardId = null;
      updateControls();
      return;
    }

    try {
      setBusy(true);
      await postJson("api/play.php", {
        card_id: pendingPlus4CardId,
        chosen_element: chosenElement,
      });
      addLocalMsg(actionMsgEl, `+4 played as ${chosenElement}.`);
      selectedCardId = null;
      pendingPlus4CardId = null;
      wildChooserEl.classList.add("hidden");
      await fetchState();
    } catch (err) {
      addLocalMsg(actionMsgEl, err.message);
    } finally {
      setBusy(false);
      updateControls();
    }
  });
});

playerNameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    joinBtn.click();
  }
});

document.addEventListener("keydown", (e) => {
  if (busy) return;

  if (e.key.toLowerCase() === "r") {
    refreshBtn.click();
  }

  if (e.key === " " || e.key === "Spacebar") {
    const canPass = !passBtn.disabled;
    if (canPass) {
      e.preventDefault();
      passBtn.click();
    }
  }

  if (e.key === "Enter") {
    const canPlay = !playBtn.disabled;
    if (canPlay && document.activeElement !== playerNameInput) {
      playBtn.click();
    }
  }

  if (e.key === "Escape") {
    selectedCardId = null;
    pendingPlus4CardId = null;
    wildChooserEl.classList.add("hidden");
    renderHand();
    updateControls();
    addLocalMsg(actionMsgEl, "Selection cleared.");
  }
});

setInterval(() => {
  if (busy) return;
  fetchState()
    .then(() => updateControls())
    .catch(() => {});
}, 1200);

fetchState()
  .then(() => updateControls())
  .catch((err) => {
    addLocalMsg(actionMsgEl, err.message);
  });