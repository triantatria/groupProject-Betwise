// =====================
//      MINES GAME
// =====================

let currentBet = 0;
let safeRevealed = 0;
let totalSafeTiles = 0;

function updateHeaderBalance(newBalance) {
  const balanceEl = document.getElementById('balance');
  const n = Number(newBalance);
  if (balanceEl && Number.isFinite(n)) {
    balanceEl.textContent = `$${n}`;
  }
}

function updatePageBalance(newBalance) {
  // Slots + Blackjack
  const slotBalance = document.querySelector('.bj-balance');
  if (slotBalance) {
    slotBalance.textContent = `Balance: $${newBalance}`;
  }

  // Mines balance
  const minesBalance = document.querySelector('.mines-balance');
  if (minesBalance) {
    minesBalance.textContent = `Balance: $${newBalance}`;
  }
}


// =====================
//  MINES MODULE
// =====================

const Mines = (() => {
  const GRID_SIZE = 25;      // 5x5 grid
  const DEFAULT_MINES = 5;

  let gridEl;
  let tiles = [];
  let numMines = DEFAULT_MINES;
  let roundActive = false;

  // UI elements
  let statusEl;
  let betInputEl;
  let mineCountInputEl;
  let startBtnEl;
  let cashoutBtnEl;

  function init() {
    gridEl = document.getElementById("minesGrid");
    if (!gridEl) return; // not the Mines page

    statusEl = document.getElementById("minesStatus");
    betInputEl = document.getElementById("minesBetInput");
    mineCountInputEl = document.getElementById("minesCountInput");
    startBtnEl = document.getElementById("startMinesBtn");
    cashoutBtnEl = document.getElementById("cashoutBtn");

    buildGrid();

    startBtnEl?.addEventListener("click", handleStartClick);
    cashoutBtnEl?.addEventListener("click", handleCashoutClick);

    roundActive = false;
    statusEl.textContent = 'Enter a bet and click "Start Game" to play.';
  }

  // -------------------------
  //       START GAME
  // -------------------------

  async function handleStartClick() {
    const bet = Number(betInputEl?.value || 0);
    if (!bet || bet <= 0) {
      statusEl.textContent = "Enter a valid bet amount to start.";
      return;
    }

    const requestedMines = Number(mineCountInputEl?.value || DEFAULT_MINES);
    numMines = (!Number.isNaN(requestedMines) && requestedMines >= 1 && requestedMines < GRID_SIZE)
      ? requestedMines
      : DEFAULT_MINES;

    try {
      const res = await fetch('/mines/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bet }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        statusEl.textContent = data.error || 'Error starting game.';
        return;
      }

      currentBet = bet;

      // 🔥 update balances everywhere
      updateHeaderBalance(data.newBalance);
      updatePageBalance(data.newBalance);

      newRound();

      startBtnEl.classList.add("hidden");
      cashoutBtnEl.classList.remove("hidden");

    } catch (err) {
      console.error('Mines start error:', err);
      statusEl.textContent = 'Network error starting game.';
    }
  }

  // -------------------------
  //       CASHOUT
  // -------------------------

  function computePayout(fullClear = false) {
    if (!currentBet) return 0;
    return fullClear ? currentBet * numMines : currentBet;
  }

  async function handleCashoutClick() {
    if (!roundActive) return;

    const payout = computePayout(false);

    try {
      const res = await fetch('/mines/cashout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payout, resultType: 'cashout' }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        statusEl.textContent = data.error || 'Error cashing out.';
        return;
      }

      endRound();
      revealAllMines();

      statusEl.textContent =
        payout > 0 ? `You won ${payout} credits!` : 'You cashed out with no payout.';

      // 🔥 update balances everywhere
      updateHeaderBalance(data.newBalance);
      updatePageBalance(data.newBalance);

      cashoutBtnEl.classList.add("hidden");
      startBtnEl.classList.remove("hidden");

    } catch (err) {
      console.error('Mines cashout error:', err);
      statusEl.textContent = 'Network error cashing out.';
    }
  }

  // -------------------------
  //       FULL CLEAR
  // -------------------------

  async function handleFullClear() {
    if (!roundActive) return;

    const payout = computePayout(true);

    try {
      const res = await fetch('/mines/cashout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payout, resultType: 'win' }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        statusEl.textContent = data.error || 'Error cashing out.';
        return;
      }

      endRound();
      revealAllMines();

      statusEl.textContent = `Board cleared! You win ${payout} credits!`;

      // 🔥 update balances everywhere
      updateHeaderBalance(data.newBalance);
      updatePageBalance(data.newBalance);

      cashoutBtnEl.classList.add("hidden");
      startBtnEl.classList.remove("hidden");

    } catch (err) {
      console.error('Mines full clear error:', err);
      statusEl.textContent = 'Network error cashing out.';
    }
  }

  // -------------------------
  //        GRID SETUP
  // -------------------------

  function buildGrid() {
    gridEl.innerHTML = "";
    tiles = [];

    for (let i = 0; i < GRID_SIZE; i++) {
      const el = document.createElement("div");
      el.classList.add("mine-tile");

      const tile = { el, index: i, isMine: false, revealed: false };

      el.addEventListener("click", () => handleTileClick(tile));

      tiles.push(tile);
      gridEl.appendChild(el);
    }
  }

  function newRound() {
    roundActive = true;

    tiles.forEach(tile => {
      tile.isMine = false;
      tile.revealed = false;
      tile.el.className = "mine-tile";
      tile.el.textContent = "";
    });

    safeRevealed = 0;
    totalSafeTiles = GRID_SIZE - numMines;

    statusEl.textContent = `New round! Avoid the ${numMines} mines.`;

    placeMines();
  }

  function placeMines() {
    const indices = Array.from(tiles.keys());
    for (let i = 0; i < numMines; i++) {
      const j = i + Math.floor(Math.random() * (indices.length - i));
      [indices[i], indices[j]] = [indices[j], indices[i]];
      tiles[indices[i]].isMine = true;
    }
  }

  // -------------------------
  //       TILE CLICK
  // -------------------------

  function handleTileClick(tile) {
    if (!roundActive || tile.revealed) return;

    tile.revealed = true;

    if (tile.isMine) {
      // LOSS
      tile.el.classList.add("mine-bomb", "mine-hit");

      statusEl.textContent = "Boom! You hit a mine.";

      fetch('/mines/cashout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payout: 0, resultType: 'loss' }),
      })
        .then(res => res.json())
        .then(data => {
          updateHeaderBalance(data.newBalance);
          updatePageBalance(data.newBalance);
        })
        .catch(err => console.error('Mines loss error:', err));

      revealAllMines();
      endRound();

      cashoutBtnEl.classList.add("hidden");
      startBtnEl.classList.remove("hidden");
      return;
    }

    // SAFE TILE
    tile.el.classList.add("mine-safe");
    safeRevealed++;

    if (safeRevealed === totalSafeTiles) {
      handleFullClear();
    } else {
      statusEl.textContent = "Safe! Keep going or cash out.";
    }
  }

  function revealAllMines() {
    tiles.forEach(tile => {
      if (tile.isMine) tile.el.classList.add("mine-bomb");
      tile.el.classList.add("mine-disabled");
    });
  }

  function endRound() {
    roundActive = false;
  }

  return { init };
})();

// Initialize Mines game
document.addEventListener("DOMContentLoaded", Mines.init);
