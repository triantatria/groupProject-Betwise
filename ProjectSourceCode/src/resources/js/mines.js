let currentBet = 0;
let safeRevealed = 0;
let totalSafeTiles = 0;

function updateHeaderBalance(newBalance) {
  const balanceEl = document.getElementById("balance");
  const n = Number(newBalance);
  if (balanceEl && Number.isFinite(n)) balanceEl.textContent = `$${n}`;
}

function updatePageBalance(newBalance) {
  const slotBalance = document.querySelector(".bj-balance");
  if (slotBalance) slotBalance.textContent = `Balance: $${newBalance}`;
  const minesBalance = document.querySelector(".mines-balance");
  if (minesBalance) minesBalance.textContent = `Balance: $${newBalance}`;
}

const Mines = (() => {
  const GRID_SIZE = 25;

  let gridEl;
  let tiles = [];
  let numMines = 5;
  let roundActive = false;

  let statusEl;
  let betInputEl;
  let mineCountInputEl;
  let startBtnEl;
  let cashoutBtnEl;

  function init() {
    gridEl = document.getElementById("minesGrid");
    if (!gridEl) return;

    statusEl = document.getElementById("minesStatus");
    betInputEl = document.getElementById("minesBetInput");
    mineCountInputEl = document.getElementById("minesCountInput");
    startBtnEl = document.getElementById("startMinesBtn");
    cashoutBtnEl = document.getElementById("cashoutBtn");

    buildGrid();

    startBtnEl.addEventListener("click", handleStartClick);
    cashoutBtnEl.addEventListener("click", handleCashoutClick);

    roundActive = false;
    statusEl.textContent = 'Enter a bet and click "Start Game" to play.';
  }

  async function handleStartClick() {
    const bet = Number(betInputEl.value || 0);
    if (!bet || bet <= 0) {
      statusEl.textContent = "Enter a valid bet amount to start.";
      return;
    }

    let requestedMines = Number.parseInt(mineCountInputEl.value, 10);
    if (
      Number.isNaN(requestedMines) ||
      requestedMines < 1 ||
      requestedMines > GRID_SIZE - 1
    ) {
      statusEl.textContent = `Enter a number of mines between 1 and ${GRID_SIZE - 1}.`;
      return;
    }

    numMines = requestedMines;

    try {
      const res = await fetch("/mines/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bet })
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        statusEl.textContent = data.error || "Error starting game.";
        return;
      }

      currentBet = bet;

      updateHeaderBalance(data.newBalance);
      updatePageBalance(data.newBalance);

      newRound();

      startBtnEl.classList.add("hidden");
      cashoutBtnEl.classList.remove("hidden");
    } catch {
      statusEl.textContent = "Network error starting game.";
    }
  }

  function computePayout(fullClear = false) {
    if (!currentBet) return 0;
    const safeTilesRevealed = fullClear ? GRID_SIZE - numMines : safeRevealed;
    const r = GRID_SIZE / (GRID_SIZE - numMines);
    const multiplier = r ** safeTilesRevealed;
    return Math.floor(currentBet * multiplier);
  }

  async function handleCashoutClick() {
    if (!roundActive) return;

    const payout = computePayout(false);

    try {
      const res = await fetch("/mines/cashout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payout, resultType: "cashout" })
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        statusEl.textContent = data.error || "Error cashing out.";
        return;
      }

      endRound();
      revealAllMines();

      if (payout > 0) {
        statusEl.textContent =
          `Cashed out! You earned ${payout} credits.\nClear the entire board next time to earn a win.`;
      } else {
        statusEl.textContent =
          `Cashed out with no payout.\nClear the entire board to receive a win!`;
      }

      updateHeaderBalance(data.newBalance);
      updatePageBalance(data.newBalance);

      cashoutBtnEl.classList.add("hidden");
      startBtnEl.classList.remove("hidden");
    } catch {
      statusEl.textContent = "Network error cashing out.";
    }
  }

  async function handleFullClear() {
    if (!roundActive) return;

    const payout = computePayout(true);

    try {
      const res = await fetch("/mines/cashout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payout, resultType: "win" })
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        statusEl.textContent = data.error || "Error cashing out.";
        return;
      }

      endRound();
      revealAllMines();

      const multiplier = GRID_SIZE / (GRID_SIZE - numMines);
      statusEl.textContent =
        `Board cleared! You earned ${payout} credits and +1 WIN!\n` +
        `Multiplier applied: bet ${currentBet} × ${multiplier.toFixed(2)}^${GRID_SIZE - numMines}.`;

      updateHeaderBalance(data.newBalance);
      updatePageBalance(data.newBalance);

      cashoutBtnEl.classList.add("hidden");
      startBtnEl.classList.remove("hidden");
    } catch {
      statusEl.textContent = "Network error cashing out.";
    }
  }

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

    statusEl.textContent = `New round! ${numMines} mines on the board.`;

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

  function handleTileClick(tile) {
    if (!roundActive || tile.revealed) return;

    tile.revealed = true;

    if (tile.isMine) {
      tile.el.classList.add("mine-bomb", "mine-hit");

      statusEl.textContent = "Boom! You hit a mine.";

      fetch("/mines/cashout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payout: 0, resultType: "loss" })
      })
        .then(res => res.json())
        .then(data => {
          updateHeaderBalance(data.newBalance);
          updatePageBalance(data.newBalance);
        });

      revealAllMines();
      endRound();

      cashoutBtnEl.classList.add("hidden");
      startBtnEl.classList.remove("hidden");
      return;
    }

    tile.el.classList.add("mine-safe");

    safeRevealed++;

    const difficultyMultiplier = numMines / GRID_SIZE;
    const tileReward = Math.floor(
      currentBet * difficultyMultiplier * safeRevealed
    );

    fetch("/mines/tile-win", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tileReward })
    })
      .then(res => res.json())
      .then(data => {
        updateHeaderBalance(data.newBalance);
        updatePageBalance(data.newBalance);
      });

    statusEl.textContent =
      `Safe! +${tileReward} credits (bet ${currentBet} × ${difficultyMultiplier.toFixed(2)} × streak ${safeRevealed}).`;

    if (safeRevealed === totalSafeTiles) handleFullClear();
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

document.addEventListener("DOMContentLoaded", Mines.init);