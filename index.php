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
    <header class="topbar">
      <div class="topbar-copy">
        <div class="eyebrow">LAN Prototype</div>
        <h1>Elemental Card Game</h1>
        <p>Shared room · humans + AI filler seats · fixed room flow</p>
      </div>

      <div class="topbar-actions">
        <button id="refreshBtn" type="button" class="btn btn-ghost">Refresh</button>
      </div>
    </header>

    <section class="hud" id="hud">
      <div class="hud-card">
        <div class="hud-label">Room</div>
        <div class="hud-value">PROTO</div>
      </div>

      <div class="hud-card">
        <div class="hud-label">Status</div>
        <div class="hud-value" id="roomStatusValue">Waiting</div>
      </div>

      <div class="hud-card">
        <div class="hud-label">Mode</div>
        <div class="hud-value" id="roomModeValue">4 Players</div>
      </div>

      <div class="hud-card">
        <div class="hud-label">Turn</div>
        <div class="hud-value" id="turnValue">-</div>
      </div>

      <div class="hud-card">
        <div class="hud-label">You</div>
        <div class="hud-value" id="meValue">Not Joined</div>
      </div>
    </section>

    <section class="table-layout">
      <div class="seat seat-top" id="seat-top"></div>
      <div class="seat seat-left" id="seat-left"></div>

      <div class="table-center">
        <section class="panel board-panel">
          <div class="board-panel__inner">
            <div class="board-stage">
              <div class="board-stage__glow"></div>
              <div id="tableArea" class="table-area"></div>
            </div>

            <aside class="side-rail">
              <div class="rail-card">
                <div class="rail-card__head">
                  <h2>Join Room</h2>
                </div>

                <div class="lobby-form">
                  <input id="playerNameInput" type="text" maxlength="50" placeholder="Enter your player name" />
                  <button id="joinBtn" type="button" class="btn btn-primary">Join PROTO</button>
                </div>

                <div id="joinMsg" class="inline-msg"></div>
              </div>

              <div class="rail-card">
                <div class="rail-card__head">
                  <h2>Room Mode</h2>
                </div>

                <div class="mode-buttons">
                  <button class="mode-btn btn btn-chip" data-mode="2" type="button">2P</button>
                  <button class="mode-btn btn btn-chip" data-mode="3" type="button">3P</button>
                  <button class="mode-btn btn btn-chip" data-mode="4" type="button">4P</button>
                </div>

                <div class="controls">
                  <button id="startGameBtn" type="button" class="btn">Start</button>
                  <button id="playBtn" type="button" class="btn btn-primary">Play</button>
                  <button id="passBtn" type="button" class="btn">Pass</button>
                  <button id="resetRoomBtn" type="button" class="btn btn-danger">Reset</button>
                </div>

                <div id="actionMsg" class="inline-msg"></div>
              </div>

              <div id="wildChooser" class="rail-card wild-chooser hidden">
                <div class="rail-card__head">
                  <h2>Choose Wild Element</h2>
                </div>

                <div class="wild-chooser__buttons">
                  <button class="wild-btn btn btn-chip" data-wild-element="Fire" type="button">Fire</button>
                  <button class="wild-btn btn btn-chip" data-wild-element="Water" type="button">Water</button>
                  <button class="wild-btn btn btn-chip" data-wild-element="Lightning" type="button">Lightning</button>
                  <button class="wild-btn btn btn-chip" data-wild-element="Earth" type="button">Earth</button>
                  <button class="wild-btn btn btn-chip" data-wild-element="Wind" type="button">Wind</button>
                  <button class="wild-btn btn btn-chip" data-wild-element="Wood" type="button">Wood</button>
                </div>
              </div>

              <div class="rail-card">
                <div class="rail-card__head">
                  <h2>Game Log</h2>
                </div>
                <div id="logArea" class="log-area"></div>
              </div>
            </aside>
          </div>
        </section>
      </div>

      <div class="seat seat-right" id="seat-right"></div>

      <div class="seat seat-bottom">
        <section class="panel human-panel">
          <div class="human-head">
            <div>
              <div class="eyebrow">Your Seat</div>
              <h2>Your Hand</h2>
              <p class="seat-sub">Compact view for desktop testing</p>
            </div>
            <div id="humanSummary" class="human-summary"></div>
          </div>

          <div id="handArea" class="hand-area"></div>
        </section>
      </div>
    </section>
  </main>

  <script src="cards.js"></script>
  <script src="app.js"></script>
</body>
</html>