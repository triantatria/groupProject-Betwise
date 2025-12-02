// mines logic


let currentBet = 0;
let safeRevealed = 0;       // number of safe tiles clicked this round
let totalSafeTiles = 0;     // GRID_SIZE - numMines for this round

function updateHeaderBalance(newBalance) {
  const balanceEl = document.getElementById('balance');
  if (!balanceEl) return;

  const n = Number(newBalance);
  if (!Number.isFinite(n)) return; // don't overwrite with NaN, null, etc.

  balanceEl.textContent = `$${n}`;
}


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
    gridEl = document.getElementById("minesGrid");
    if (!gridEl) return;

    statusEl = document.getElementById("minesStatus");
    betInputEl = document.getElementById("minesBetInput");
    mineCountInputEl = document.getElementById("minesCountInput");
    startBtnEl = document.getElementById("startMinesBtn");
    cashoutBtnEl = document.getElementById("cashoutBtn");

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

  async function handleStartClick() {
    const bet = Number(betInputEl?.value ?? 0);
    if (!bet || bet <= 0) {
      if (statusEl) statusEl.textContent = "Enter a valid bet amount to start.";
      return;
    }

    const requestedMines = Number(mineCountInputEl?.value ?? DEFAULT_MINES);
    if (!Number.isNaN(requestedMines) && requestedMines >= 1 && requestedMines < GRID_SIZE) {
      numMines = requestedMines;
    } else {
      numMines = DEFAULT_MINES;
    }
    // start game via server
    try {
      const res = await fetch('/mines/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bet }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        if (statusEl) statusEl.textContent = data.error || 'Error starting game.';
        return;
      }

      currentBet = bet;
      // 🔹 keep wallet hover in sync
      updateHeaderBalance(data.newBalance);

      // Optionally update some balance display element if you have one
      const balanceEl = document.getElementById('balance');
      if (balanceEl && typeof data.newBalance === 'number') {
        balanceEl.textContent = `$${data.newBalance}`;
      }


      newRound();

      // toggle buttons: hide Start, show Cashout
      if (startBtnEl) startBtnEl.classList.add("hidden");
      if (cashoutBtnEl) cashoutBtnEl.classList.remove("hidden");

    } catch (err) {
      console.error('Mines start fetch error:', err);
      if (statusEl) statusEl.textContent = 'Network error starting Mines game.';
    }
  }

  function computePayout(isFullClear = false) {
    if (!currentBet || currentBet <= 0) return 0;

    if (isFullClear) {
      // Full board cleared: bet * numberOfMines
      return currentBet * numMines;
    }

    // Regular cashout: only get your bet back
    return currentBet;
  }



  async function handleCashoutClick() {
    if (!roundActive) return;

    const payout = computePayout(); // implement actual payout logic

    // cashout via server
    try {
      const res = await fetch('/mines/cashout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payout, resultType: 'cashout' }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        if (statusEl) statusEl.textContent = data.error || 'Error cashing out.';
        return;
      }

      endRound();
      revealAllMines();

      if (statusEl) {
        statusEl.textContent = payout > 0
          ? `You cashed out and won ${payout} credits!`
          : 'You cashed out with no payout.';
      }

      // 🔹 keep wallet hover in sync
      updateHeaderBalance(data.newBalance);

      // update header balance if exists
      const balanceEl = document.getElementById('balance');
      if (balanceEl && typeof data.newBalance === 'number') {
        balanceEl.textContent = `$${data.newBalance}`;
      }
      // toggle back: show Start, hide Cashout
      if (cashoutBtnEl) cashoutBtnEl.classList.add("hidden");
      if (startBtnEl) startBtnEl.classList.remove("hidden");

    } catch (err) {
      console.error('Mines cashout fetch error:', err);
      if (statusEl) statusEl.textContent = 'Network error cashing out.';
    }
  }

  async function handleFullClear() {
  if (!roundActive) return;

  const payout = computePayout(true); // bet * numMines

  try {
    const res = await fetch('/mines/cashout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payout, resultType: 'win' }),
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      if (statusEl) statusEl.textContent = data.error || 'Error cashing out.';
      return;
    }

    endRound();
    revealAllMines();

    if (statusEl) {
      statusEl.textContent = `Board cleared! You win ${payout} credits (bet × mines).`;
    }
    // 🔹 keep wallet hover in sync
    updateHeaderBalance(data.newBalance);

    const balanceEl = document.getElementById('balance');
    if (balanceEl && typeof data.newBalance === 'number') {
      balanceEl.textContent = `$${data.newBalance}`;
    }

    if (cashoutBtnEl) cashoutBtnEl.classList.add("hidden");
    if (startBtnEl) startBtnEl.classList.remove("hidden");
  } catch (err) {
    console.error('Mines full clear cashout error:', err);
    if (statusEl) statusEl.textContent = 'Network error cashing out.';
  }
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

    // reset counters
    safeRevealed = 0;
    totalSafeTiles = GRID_SIZE - numMines;

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
      // auto cashout as loss (no payout)
      fetch('/mines/cashout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payout: 0, resultType: 'loss' }),
      }).then(res => res.json()).then(data => {
        const balanceEl = document.getElementById('balance');
        if (balanceEl && typeof data.newBalance === 'number') {
          balanceEl.textContent = `$${data.newBalance}`;
        }
        // 🔹 keep wallet hover in sync
        updateHeaderBalance(data.newBalance);
      }).catch(err => console.error('Mines loss cashout error:', err));



      revealAllMines();
      endRound();

      // show Start again, hide Cashout
      if (cashoutBtnEl) cashoutBtnEl.classList.add("hidden");
      if (startBtnEl) startBtnEl.classList.remove("hidden");
    } else {
      tile.el.classList.add("mine-safe");
      safeRevealed++;

      // check for full clear
      if (safeRevealed === totalSafeTiles) {
        // FULL CLEAR!
        handleFullClear();
      } else {
        if (statusEl) statusEl.textContent = "Safe! Keep going or cash out.";
      }
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