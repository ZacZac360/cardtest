<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Elemental Card Game LAN Prototype</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <main class="app">
    <header class="top-strip">
      <div class="top-strip__brand">
        <div class="eyebrow">LAN Prototype</div>
        <h1>Elemental Card Game</h1>
      </div>

      <div class="status-strip">
        <div class="status-chip">
          <span class="status-chip__label">Room</span>
          <span class="status-chip__value">PROTO</span>
        </div>

        <div class="status-chip">
          <span class="status-chip__label">Status</span>
          <span class="status-chip__value" id="roomStatusValue">Waiting</span>
        </div>

        <div class="status-chip">
          <span class="status-chip__label">Mode</span>
          <span class="status-chip__value" id="roomModeValue">4P</span>
        </div>

        <div class="status-chip status-chip--turn">
          <span class="status-chip__label">Turn</span>
          <span class="status-chip__value" id="turnValue">-</span>
        </div>

        <div class="status-chip">
          <span class="status-chip__label">You</span>
          <span class="status-chip__value" id="meValue">Not Joined</span>
        </div>
      </div>

      <div class="top-strip__actions">
        <button id="refreshBtn" type="button" class="ui-btn ui-btn--ghost">Refresh</button>
        <button id="logToggleBtn" type="button" class="ui-btn ui-btn--ghost">Log</button>
        <button id="toolsToggleBtn" type="button" class="ui-btn ui-btn--ghost">Tools</button>
      </div>
    </header>

    <section class="table-shell">
      <div class="seat seat-top" id="seat-top"></div>
      <div class="seat seat-left" id="seat-left"></div>
      <div class="seat seat-right" id="seat-right"></div>

      <section class="play-surface">
        <div class="play-surface__glow"></div>
        <div class="play-surface__rim"></div>
        <div id="tableArea" class="table-area"></div>

        <div id="wildChooser" class="wild-chooser hidden">
          <div class="wild-chooser__title">Choose element for +4</div>
          <div class="wild-chooser__buttons">
            <button class="wild-btn" data-wild-element="Fire" type="button">Fire</button>
            <button class="wild-btn" data-wild-element="Water" type="button">Water</button>
            <button class="wild-btn" data-wild-element="Lightning" type="button">Lightning</button>
            <button class="wild-btn" data-wild-element="Earth" type="button">Earth</button>
            <button class="wild-btn" data-wild-element="Wind" type="button">Wind</button>
            <button class="wild-btn" data-wild-element="Wood" type="button">Wood</button>
          </div>
        </div>
      </section>

      <aside id="toolsPanel" class="floating-panel tools-panel hidden">
        <div class="floating-panel__head">
          <h2>Room Tools</h2>
          <button id="toolsCloseBtn" type="button" class="icon-btn" aria-label="Close tools">✕</button>
        </div>

        <div class="tools-section" id="joinSection">
          <div class="tools-section__label">Join Room</div>
          <div class="join-row">
            <input id="playerNameInput" type="text" maxlength="50" placeholder="Enter your player name" />
            <button id="joinBtn" type="button" class="ui-btn ui-btn--primary">Join</button>
          </div>
          <div id="joinMsg" class="inline-msg"></div>
        </div>

        <div class="tools-section" id="hostControlsSection">
          <div class="tools-section__label">Host Controls</div>

          <div class="mode-buttons">
            <button class="mode-btn" data-mode="2" type="button">2P</button>
            <button class="mode-btn" data-mode="3" type="button">3P</button>
            <button class="mode-btn" data-mode="4" type="button">4P</button>
          </div>

          <div class="host-buttons">
            <button id="startGameBtn" type="button" class="ui-btn">Start Game</button>
            <button id="resetRoomBtn" type="button" class="ui-btn ui-btn--danger">Reset Room</button>
          </div>

          <div id="actionMsg" class="inline-msg"></div>
        </div>

        <div class="tools-section tools-section--hint">
          <div class="tools-section__label">Controls</div>
          <div class="hint-list">
            <div>Desktop: click = select, double click = play</div>
            <div>Phone: tap = select, tap selected card again = play</div>
            <div>Enter = play selected</div>
            <div>Space = pass</div>
            <div>Esc = clear selection</div>
          </div>
        </div>
      </aside>

      <aside id="logPanel" class="floating-panel log-panel hidden">
        <div class="floating-panel__head">
          <h2>Game Log</h2>
          <button id="logCloseBtn" type="button" class="icon-btn" aria-label="Close log">✕</button>
        </div>
        <div id="logArea" class="log-area"></div>
      </aside>
    </section>

    <section class="hand-dock">
      <div class="hand-dock__top">
        <div class="hand-title-wrap">
          <div class="eyebrow">Your Seat</div>
          <h2>Your Hand</h2>
        </div>

        <div id="humanSummary" class="human-summary"></div>

        <div class="hand-actions">
          <button id="playBtn" type="button" class="ui-btn">Play</button>
          <button id="passBtn" type="button" class="ui-btn ui-btn--primary">Pass</button>
        </div>
      </div>

      <div id="handArea" class="hand-area"></div>
    </section>
  </main>

  <script src="cards.js"></script>
  <script src="app.js"></script>
</body>
</html>