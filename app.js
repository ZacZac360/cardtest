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

const toolsPanelEl = document.getElementById("toolsPanel");
const logPanelEl = document.getElementById("logPanel");
const toolsToggleBtn = document.getElementById("toolsToggleBtn");
const logToggleBtn = document.getElementById("logToggleBtn");
const toolsCloseBtn = document.getElementById("toolsCloseBtn");
const logCloseBtn = document.getElementById("logCloseBtn");
const joinSectionEl = document.getElementById("joinSection");
const hostControlsSectionEl = document.getElementById("hostControlsSection");
const modeButtonsWrapEl = hostControlsSectionEl
  ? hostControlsSectionEl.querySelector(".mode-buttons")
  : null;

const IS_TOUCH_DEVICE =
  window.matchMedia("(pointer: coarse)").matches ||
  "ontouchstart" in window ||
  navigator.maxTouchPoints > 0;

let latestState = null;
let selectedCardId = null;
let pendingPlus4CardId = null;
let busy = false;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function addLocalMsg(el, text) {
  if (el) el.textContent = text || "";
}

function getSeatByNo(seatNo) {
  return (latestState?.seats || []).find((s) => s && s.seat_no === seatNo) || null;
}

function seatLabel(seatNo) {
  return `Seat ${seatNo}`;
}

function getEffectiveElement(card) {
  if (!card) return null;
  if (card.kind === "plus4") return card.chosenElement || null;
  return card.element || null;
}

function cardValueText(card) {
  if (!card) return "—";
  if (card.kind === "normal") return String(card.value ?? "—");
  if (card.kind === "plus2") return "+2";
  if (card.kind === "plus4") return "+4";
  return "—";
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

function getCardGradient(card) {
  const palettes = {
    Fire: "linear-gradient(180deg, #ff9c7a 0%, #d4553d 100%)",
    Water: "linear-gradient(180deg, #8cc6ff 0%, #4f7fc0 100%)",
    Earth: "linear-gradient(180deg, #b89472 0%, #7f624a 100%)",
    Lightning: "linear-gradient(180deg, #d1b5ff 0%, #8058d8 100%)",
    Wind: "linear-gradient(180deg, #8fe2ea 0%, #45aebc 100%)",
    Wood: "linear-gradient(180deg, #8fd2a7 0%, #3f8d58 100%)",
    Wild: "linear-gradient(180deg, #b8c7d9 0%, #67788f 100%)",
  };

  if (!card) {
    return "linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.02))";
  }

  if (card.kind === "plus4") {
    if (!card.chosenElement) {
      return "linear-gradient(180deg, #181818 0%, #000000 100%)";
    }
    return palettes[card.chosenElement] || palettes.Wild;
  }

  return palettes[card.element] || palettes.Wild;
}

function compareElements(challenger, defender) {
  if (!challenger || !defender) return "neutral";
  if (challenger === "Wild" || defender === "Wild") return "neutral";
  if (STRONG_AGAINST[challenger] === defender) return "strong";
  if (STRONG_AGAINST[defender] === challenger) return "weak";
  return "neutral";
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

function applyState(data) {
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

async function fetchState() {
  const res = await fetch("api/state.php", { cache: "no-store" });
  const data = await res.json();

  if (!data.ok) {
    throw new Error(data.msg || "Failed to fetch state.");
  }

  applyState(data);
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
  if (room.status === "waiting") return "Waiting for host.";
  if (room.status === "finished") {
    return room.winner_seat === me.seat_no ? "You won." : "Game finished.";
  }

  const turnSeatData = room.current_turn_seat ? getSeatByNo(room.current_turn_seat) : null;

  if (room.current_turn_seat !== me.seat_no) {
    if (turnSeatData?.player_type === "ai") {
      return `${turnSeatData.player_name} is thinking...`;
    }
    return `Waiting for ${turnSeatData?.player_name || "other player"}.`;
  }

  const playable = getPlayableCards(me.hand || [], room);
  const pendingDraw = Number(room.pending_draw || 0);

  if (pendingDraw > 0) {
    if (playable.length > 0) {
      return `Stack ${room.active_card?.kind === "plus4" ? "+4" : "+2"} or pass.`;
    }
    return `No stack available. Pass and draw ${pendingDraw}.`;
  }

  if (playable.length > 0) {
    return IS_TOUCH_DEVICE
      ? `${playable.length} playable card(s). Tap to select. Tap again to play.`
      : `${playable.length} playable card(s). Double click to play.`;
  }

  return "No stronger element. Pass or use +4.";
}

function setBusy(nextBusy) {
  busy = !!nextBusy;
  if (joinBtn) joinBtn.disabled = busy;
  if (refreshBtn) refreshBtn.disabled = busy;
  if (startGameBtn) startGameBtn.disabled = busy;
  if (resetRoomBtn) resetRoomBtn.disabled = busy;
  if (playBtn) playBtn.disabled = busy;
  if (passBtn) passBtn.disabled = busy;
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

function renderAICardBacks(count, isTop = false) {
  const visible = Math.min(Number(count || 0), isTop ? 8 : 6);
  let html = `<div class="seat-fan ${isTop ? "seat-fan--top" : ""}">`;
  for (let i = 0; i < visible; i += 1) {
    html += `<div class="ai-cardback"></div>`;
  }
  html += `</div>`;
  return html;
}

function renderSeat(mountEl, seatNo) {
  const seat = getSeatByNo(seatNo);
  const room = latestState?.room;
  const isTurn = room?.current_turn_seat === seatNo;
  const isTopSeat = seatNo === 3;

  if (!mountEl) return;

  if (!seat || !seat.occupied) {
    mountEl.innerHTML = `
      <div class="seat-box seat-box--open ${isTopSeat ? "seat-box--top" : ""}">
        <div class="seat-head ${isTopSeat ? "seat-head--top" : ""}">
          <div>
            <div class="seat-name">Open Seat</div>
            <p class="seat-sub">${seatLabel(seatNo)}</p>
          </div>
          <div class="seat-badges">
            <div class="seat-badge">Waiting</div>
          </div>
        </div>
      </div>
    `;
    return;
  }

  const badges = [];
  if (seat.is_me) badges.push(`<div class="seat-badge seat-badge--you">You</div>`);
  if (isTurn) badges.push(`<div class="seat-badge seat-badge--turn">Turn</div>`);

  if (isTopSeat) {
    mountEl.innerHTML = `
      <div class="seat-box seat-box--top ${seat.is_me ? "seat-box--me" : ""} ${isTurn ? "seat-box--turn" : ""}">
        <div class="seat-head seat-head--top">
          <div class="seat-top-main">
            <div class="seat-top-id">
              <div class="seat-name">${escapeHtml(seat.player_name)}</div>
              <p class="seat-sub">${seatLabel(seatNo)} · ${seat.player_type === "ai" ? "AI" : "Human"}</p>
            </div>

            <div class="seat-top-meta">
              <div class="seat-count">${seat.card_count} card${seat.card_count === 1 ? "" : "s"}</div>
              <div class="seat-badges">${badges.join("")}</div>
            </div>
          </div>

          <div class="seat-top-fanwrap">
            ${renderAICardBacks(seat.card_count, true)}
          </div>
        </div>
      </div>
    `;
    return;
  }

  mountEl.innerHTML = `
    <div class="seat-box ${seat.is_me ? "seat-box--me" : ""} ${isTurn ? "seat-box--turn" : ""}">
      <div class="seat-head">
        <div>
          <div class="seat-name">${escapeHtml(seat.player_name)}</div>
          <p class="seat-sub">${seatLabel(seatNo)} · ${seat.player_type === "ai" ? "AI" : "Human"}</p>
        </div>
        <div class="seat-badges">${badges.join("")}</div>
      </div>

      <div class="seat-meta">
        <div class="seat-count">${seat.card_count} card${seat.card_count === 1 ? "" : "s"}</div>
      </div>

      ${renderAICardBacks(seat.card_count, false)}
    </div>
  `;
}

function renderHudAndSummary() {
  const room = latestState?.room;
  const me = latestState?.me;
  if (!room) return;

  const turnSeat = room.current_turn_seat;
  const turnSeatData = turnSeat ? getSeatByNo(turnSeat) : null;
  const playableCount = me ? getPlayableCards(me.hand || [], room).length : 0;
  const activeText = room.active_card ? cardText(room.active_card) : "None";

  roomStatusValueEl.textContent = room.status;
  roomModeValueEl.textContent = `${room.max_players}P`;
  turnValueEl.textContent = turnSeatData?.player_name || "-";
  meValueEl.textContent = me ? `${me.player_name} (Seat ${me.seat_no})` : "Not Joined";

  humanSummaryEl.innerHTML = `
    <div class="summary-pill">Mode ${room.max_players}P</div>
    <div class="summary-pill">Pending ${room.pending_draw || 0}</div>
    <div class="summary-pill">Playable ${playableCount}</div>
    <div class="summary-pill">Active ${escapeHtml(activeText)}</div>
    <div class="summary-pill">${escapeHtml(getTurnHint() || "Ready")}</div>
  `;
}

function renderCenterTable() {
  const room = latestState?.room;
  if (!room || !tableAreaEl) return;

  const activeCard = room.active_card || null;
  const activeElement = room.active_element || getEffectiveElement(activeCard) || "None";
  const turnSeatData = room.current_turn_seat ? getSeatByNo(room.current_turn_seat) : null;
  const winnerSeatData = room.winner_seat ? getSeatByNo(room.winner_seat) : null;
  const leadSeatData = room.lead_seat ? getSeatByNo(room.lead_seat) : null;

  const centerTitle = winnerSeatData
    ? `${winnerSeatData.player_name} wins`
    : room.status === "playing"
      ? (turnSeatData?.player_name || "In play")
      : room.status;

  const helperLine = winnerSeatData
    ? `Winner: ${winnerSeatData.player_name}`
    : `Lead: ${leadSeatData?.player_name || "-"} · Turn: ${turnSeatData?.player_name || "-"}`;

  tableAreaEl.innerHTML = `
    <div class="board-center">
      <div class="center-meta">
        <div class="meta-pill">${escapeHtml(room.status.toUpperCase())}</div>
        <div class="meta-pill">Element ${escapeHtml(activeElement)}</div>
        <div class="meta-pill">Pending ${room.pending_draw || 0}</div>
        <div class="meta-pill">Passes ${room.pass_count || 0}</div>
        <div class="meta-pill meta-pill--turn">${escapeHtml(centerTitle)}</div>
      </div>

      <div class="center-play">
        <div class="stack-wrap">
          <div class="stack-label">Draw Pile</div>
          <div class="deck-stack">DECK</div>
        </div>

        ${
          activeCard
            ? `
              <div class="active-card" style="background:${getCardGradient(activeCard)};">
                <div class="active-card__top">
                  <div class="active-card__kind">${escapeHtml(activeCard.kind.toUpperCase())}</div>
                  <div class="active-card__mini">${escapeHtml(activeCard.element || activeCard.chosenElement || "Wild")}</div>
                </div>

                <div class="active-card__value">${escapeHtml(cardValueText(activeCard))}</div>

                <div class="active-card__name">${escapeHtml(cardText(activeCard))}</div>

                <div class="active-card__foot">
                  <span>${escapeHtml(activeElement)}</span>
                  <span>${escapeHtml(getEffectiveElement(activeCard) || "Unset")}</span>
                </div>
              </div>
            `
            : `
              <div class="active-card active-card--empty">
                <div class="active-card__top">
                  <div class="active-card__kind">EMPTY</div>
                  <div class="active-card__mini">Table</div>
                </div>

                <div class="active-card__value">—</div>

                <div class="active-card__name">No card on table</div>

                <div class="active-card__foot">
                  <span>Lead starts</span>
                  <span>None</span>
                </div>
              </div>
            `
        }

        <div class="center-sideinfo">
          <div class="center-sideinfo__card">
            <div class="center-sideinfo__label">Match State</div>
            <div class="center-sideinfo__value">${escapeHtml(centerTitle)}</div>
            <div class="center-sideinfo__sub">${escapeHtml(helperLine)}</div>
          </div>

          <div class="center-sideinfo__card">
            <div class="center-sideinfo__label">Hint</div>
            <div class="center-sideinfo__sub">${escapeHtml(getTurnHint() || "Shared room state")}</div>
          </div>
        </div>
      </div>

      <div class="center-statusbar">
        <div class="center-statusbar__main">${escapeHtml(helperLine)}</div>
        <div class="center-statusbar__sub">${escapeHtml(getTurnHint() || "Shared room state")}</div>
      </div>
    </div>
  `;
}

function getHandFanTransform(index, total, selected, playable) {
  const mid = (total - 1) / 2;
  const offset = index - mid;
  const rotate = offset * 3.2;
  const yBase = Math.abs(offset) * -1.2;

  let y = yBase;
  if (playable) y -= 5;
  if (selected) y -= 11;

  return `transform: translateY(${y}px) rotate(${rotate}deg); z-index:${100 + index};`;
}

async function handleCardPrimaryAction(cardId) {
  const card = getCardById(cardId);
  if (!card) return;

  const isSameSelected = selectedCardId === cardId;
  const playable = cardIsPlayable(card);

  if (IS_TOUCH_DEVICE) {
    if (isSameSelected && playable && !busy) {
      await tryPlaySelectedCard();
      return;
    }

    selectedCardId = cardId;
    pendingPlus4CardId = null;
    wildChooserEl.classList.add("hidden");

    renderHand();
    updateControls();

    if (!playable) {
      addLocalMsg(actionMsgEl, "That card cannot be played right now.");
    } else {
      addLocalMsg(actionMsgEl, card.kind === "plus4"
        ? `Selected ${cardText(card)}. Tap again to choose element and play.`
        : `Selected ${cardText(card)}. Tap again to play.`);
    }
    return;
  }

  selectedCardId = isSameSelected ? null : cardId;
  pendingPlus4CardId = null;
  wildChooserEl.classList.add("hidden");

  renderHand();
  updateControls();

  const afterCard = getCardById(cardId);
  if (!afterCard) return;

  if (selectedCardId === null) {
    addLocalMsg(actionMsgEl, "Selection cleared.");
    return;
  }

  if (!playable) {
    addLocalMsg(actionMsgEl, "That card cannot be played right now.");
  } else {
    addLocalMsg(actionMsgEl, `Selected ${cardText(afterCard)}. Double click to play.`);
  }
}

function renderHand() {
  const room = latestState?.room;
  const me = latestState?.me;

  if (!handAreaEl) return;

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

  const total = myHand.length;

  const cardsHtml = myHand.map((card, index) => {
    const selected = selectedCardId === card.id;
    const playable = cardIsPlayable(card);
    const selectedClass = selected ? "selected-card" : "";
    const disabledClass = playable ? "" : "is-unplayable";
    const inlineStyle = `${getHandFanTransform(index, total, selected, playable)} background:${getCardGradient(card)};`;

    return `
      <button
        type="button"
        class="hand-card ${selectedClass} ${disabledClass}"
        data-card-id="${escapeHtml(card.id)}"
        data-playable="${playable ? "1" : "0"}"
        title="${escapeHtml(cardText(card))}"
        style="${inlineStyle}"
      >
        <div class="hand-card__top">
          <div class="hand-card__kind">${escapeHtml(card.kind.toUpperCase())}</div>
          <div class="hand-card__value">${escapeHtml(cardValueText(card))}</div>
        </div>

        <div class="hand-card__name">${escapeHtml(cardText(card))}</div>
        <div class="hand-card__meta">${escapeHtml(card.element || card.chosenElement || "Wild")}</div>
        <div class="hand-card__status">${playable ? "Playable" : "Cannot play now"}</div>
      </button>
    `;
  }).join("");

  handAreaEl.innerHTML = `<div class="hand-fan">${cardsHtml}</div>`;

  handAreaEl.querySelectorAll("[data-card-id]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const cardId = btn.dataset.cardId;
      if (!cardId || busy) return;
      await handleCardPrimaryAction(cardId);
    });

    if (!IS_TOUCH_DEVICE) {
      btn.addEventListener("dblclick", async () => {
        const cardId = btn.dataset.cardId;
        if (!cardId || busy) return;

        selectedCardId = cardId;
        renderHand();
        updateControls();
        await tryPlaySelectedCard();
      });
    }
  });
}

function renderLogs() {
  const logs = latestState?.logs || [];
  if (!logAreaEl) return;

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

function updatePanelsVisibility() {
  const room = latestState?.room;
  const me = latestState?.me;
  const hasJoined = !!me;
  const isHost = !!room?.is_host;
  const isWaiting = room?.status === "waiting";

  if (joinSectionEl) {
    joinSectionEl.classList.toggle("hidden", hasJoined);
  }

  if (hostControlsSectionEl) {
    hostControlsSectionEl.classList.toggle("hidden", !isHost);
  }

  if (modeButtonsWrapEl) {
    modeButtonsWrapEl.classList.toggle("hidden", !isHost || !isWaiting);
  }

  if (startGameBtn) {
    startGameBtn.classList.toggle("hidden", !isHost || !isWaiting);
  }

  if (resetRoomBtn) {
    resetRoomBtn.classList.toggle("hidden", !isHost);
    resetRoomBtn.disabled = busy || !isHost;
  }

  if (hasJoined && !isHost && room?.status === "playing") {
    toolsPanelEl.classList.add("hidden");
  }
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

  if (joinBtn) joinBtn.disabled = busy;
  if (refreshBtn) refreshBtn.disabled = busy;
  if (startGameBtn) startGameBtn.disabled = busy || !room?.is_host || room?.status !== "waiting";
  if (passBtn) passBtn.disabled = busy || !myTurn;
  if (playBtn) playBtn.disabled = busy || !myTurn || !selectedCard || !canPlaySelected || waitingForWild;

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
  renderCenterTable();
  renderHand();
  renderLogs();
  updateModeButtons();
  updatePanelsVisibility();
  updateControls();
}

async function tryPlaySelectedCard() {
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
    const data = await postJson("api/play.php", { card_id: selectedCardId });

    addLocalMsg(actionMsgEl, "Card played.");
    selectedCardId = null;
    pendingPlus4CardId = null;
    wildChooserEl.classList.add("hidden");

    applyState(data);
  } catch (err) {
    addLocalMsg(actionMsgEl, err.message);
  } finally {
    setBusy(false);
    updateControls();
  }
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

if (joinBtn) {
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
}

if (refreshBtn) {
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
}

if (startGameBtn) {
  startGameBtn.addEventListener("click", async () => {
    try {
      setBusy(true);
      const data = await postJson("api/start-game.php", {});
      addLocalMsg(actionMsgEl, "Game started.");
      selectedCardId = null;
      pendingPlus4CardId = null;
      wildChooserEl.classList.add("hidden");

      applyState(data);
    } catch (err) {
      addLocalMsg(actionMsgEl, err.message);
    } finally {
      setBusy(false);
      updateControls();
    }
  });
}

if (playBtn) {
  playBtn.addEventListener("click", async () => {
    await tryPlaySelectedCard();
  });
}

if (passBtn) {
  passBtn.addEventListener("click", async () => {
    try {
      setBusy(true);
      const data = await postJson("api/pass.php", {});
      addLocalMsg(actionMsgEl, "Turn passed.");
      selectedCardId = null;
      pendingPlus4CardId = null;
      wildChooserEl.classList.add("hidden");

      applyState(data);
    } catch (err) {
      addLocalMsg(actionMsgEl, err.message);
    } finally {
      setBusy(false);
      updateControls();
    }
  });
}

if (resetRoomBtn) {
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
}

if (wildChooserEl) {
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
        const data = await postJson("api/play.php", {
          card_id: pendingPlus4CardId,
          chosen_element: chosenElement,
        });
        addLocalMsg(actionMsgEl, `+4 played as ${chosenElement}.`);
        selectedCardId = null;
        pendingPlus4CardId = null;
        wildChooserEl.classList.add("hidden");

        applyState(data);
      } catch (err) {
        addLocalMsg(actionMsgEl, err.message);
      } finally {
        setBusy(false);
        updateControls();
      }
    });
  });
}

if (toolsToggleBtn) {
  toolsToggleBtn.addEventListener("click", () => {
    toolsPanelEl.classList.toggle("hidden");
  });
}

if (logToggleBtn) {
  logToggleBtn.addEventListener("click", () => {
    logPanelEl.classList.toggle("hidden");
  });
}

if (toolsCloseBtn) {
  toolsCloseBtn.addEventListener("click", () => {
    toolsPanelEl.classList.add("hidden");
  });
}

if (logCloseBtn) {
  logCloseBtn.addEventListener("click", () => {
    logPanelEl.classList.add("hidden");
  });
}

if (playerNameInput) {
  playerNameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      joinBtn.click();
    }
  });
}

document.addEventListener("keydown", (e) => {
  if (busy) return;

  if (e.key.toLowerCase() === "r") {
    refreshBtn.click();
  }

  if (e.key === " " || e.key === "Spacebar") {
    if (!passBtn.disabled) {
      e.preventDefault();
      passBtn.click();
    }
  }

  if (e.key === "Enter") {
    if (document.activeElement !== playerNameInput && !playBtn.disabled) {
      e.preventDefault();
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
}, 1000);

fetchState()
  .then(() => {
    updateControls();
    toolsPanelEl.classList.remove("hidden");
  })
  .catch((err) => {
    addLocalMsg(actionMsgEl, err.message);
  });