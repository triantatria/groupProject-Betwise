// mines logic

const Mines = (() => {
  const GRID_SIZE = 25;        // 5x5
  const DEFAULT_MINES = 5;     // fallback if input is bad

  let gridEl;
  let tiles = [];              // { el, index, isMine, revealed }
  let numMines = DEFAULT_MINES;
  let roundActive = false;

  // UI elements
  let statusEl;
  let betInputEl;
  let mineCountInputEl;
  let startBtnEl;
  let cashoutBtnEl;

  function init() {
    // only run on the mines page
    gridEl          = document.getElementById("minesGrid");
    if (!gridEl) return;

    statusEl        = document.getElementById("minesStatus");
    betInputEl      = document.getElementById("minesBetInput");
    mineCountInputEl = document.getElementById("minesCountInput");
    startBtnEl      = document.getElementById("startMinesBtn");
    cashoutBtnEl    = document.getElementById("cashoutBtn");

    buildGrid();

    if (startBtnEl) {
      startBtnEl.addEventListener("click", handleStartClick);
    }

    if (cashoutBtnEl) {
      cashoutBtnEl.addEventListener("click", handleCashoutClick);
    }

    roundActive = false;
    if (statusEl) {
      statusEl.textContent = 'Enter a bet and click "Start Game" to play.';
    }
  }

  function handleStartClick() {
    const bet = Number(betInputEl?.value ?? 0);
    if (!bet || bet <= 0) {
      if (statusEl) statusEl.textContent = "Enter a bet amount to start.";
      return;
    }

    const requestedMines = Number(mineCountInputEl?.value ?? DEFAULT_MINES);
    if (!Number.isNaN(requestedMines) && requestedMines >= 1 && requestedMines < GRID_SIZE) {
      numMines = requestedMines;
    } else {
      numMines = DEFAULT_MINES;
    }

    newRound();

    // toggle buttons: hide Start, show Cashout
    if (startBtnEl) startBtnEl.classList.add("hidden");
    if (cashoutBtnEl) cashoutBtnEl.classList.remove("hidden");
  }

  function handleCashoutClick() {
    if (!roundActive) return;

    endRound();
    revealAllMines();

    if (statusEl) {
      statusEl.textContent = "You cashed out! (Hook payout into wallet here.)";
    }

    // toggle back: show Start, hide Cashout
    if (cashoutBtnEl) cashoutBtnEl.classList.add("hidden");
    if (startBtnEl) startBtnEl.classList.remove("hidden");
  }

  function buildGrid() {
    gridEl.innerHTML = "";
    tiles = [];

    for (let i = 0; i < GRID_SIZE; i++) {
      const el = document.createElement("div");
      el.classList.add("mine-tile");

      const tile = {
        el,
        index: i,
        isMine: false,
        revealed: false
      };

      el.addEventListener("click", () => handleTileClick(tile));

      tiles.push(tile);
      gridEl.appendChild(el);
    }
  }

  function newRound() {
    roundActive = true;

    // reset tiles
    tiles.forEach(tile => {
      tile.isMine = false;
      tile.revealed = false;
      tile.el.classList.remove("mine-safe", "mine-bomb", "mine-hit", "mine-disabled");
      tile.el.textContent = ""; // emoji / text if you want later
    });

    if (statusEl) {
      statusEl.textContent = `New round! Avoid the ${numMines} mines.`;
    }

    placeMines();
  }

  // main randomization
  function placeMines() {
    const indices = Array.from(tiles.keys());

    // Fisher–Yates style selection of first numMines
    for (let i = 0; i < numMines; i++) {
      const j = i + Math.floor(Math.random() * (indices.length - i));
      [indices[i], indices[j]] = [indices[j], indices[i]];

      const mineIndex = indices[i];
      tiles[mineIndex].isMine = true;
    }
  }

  function handleTileClick(tile) {
    if (!roundActive || tile.revealed) return;

    tile.revealed = true;

    if (tile.isMine) {
      // hit a mine → lose
      tile.el.classList.add("mine-bomb", "mine-hit");
      if (statusEl) statusEl.textContent = "Boom! You hit a mine.";
      revealAllMines();
      endRound();

      // show Start again, hide Cashout
      if (cashoutBtnEl) cashoutBtnEl.classList.add("hidden");
      if (startBtnEl) startBtnEl.classList.remove("hidden");
    } else {
      tile.el.classList.add("mine-safe");
      if (statusEl) statusEl.textContent = "Safe! Keep going or cash out.";
      // here you could increment multiplier / potential payout
    }
  }

  function revealAllMines() {
    tiles.forEach(tile => {
      if (tile.isMine) {
        tile.el.classList.add("mine-bomb");
      }
      tile.el.classList.add("mine-disabled");
    });
  }

  function endRound() {
    roundActive = false;
  }

  return { init, newRound };
})();

// init mines when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  Mines.init();
});