/* Page transition  */
function startHomeTransition() {
  const overlay = document.getElementById("page-transition");
  if (!overlay) return;
  overlay.classList.add("active");
  setTimeout(() => location.href = "/home", 700);
}

/* Mines */
const grid = document.getElementById("minesGrid");
if (grid) {
  for (let i = 0; i < 25; i++) {
    const tile = document.createElement("div");
    tile.classList.add("mine-tile");
    tile.addEventListener("click", () => tile.classList.toggle("mine-safe"));
    grid.appendChild(tile);
  }
}

/* Slots */
const spinBtn = document.getElementById("slotSpin");
const reels = ["reel1","reel2","reel3"].map(id => document.getElementById(id));
if (spinBtn && reels.every(r => r)) {
  spinBtn.addEventListener("click", () => {
    reels.forEach(r => r.classList.add("spin"));
    setTimeout(() => reels.forEach(r => r.classList.remove("spin")), 900);
  });
}

/* BlackJack */
(function initBlackjackUI() {
  const dealBtn = document.getElementById("bjDealBtn");
  const dealerRow = document.getElementById("dealerCards");
  const playerRow = document.getElementById("playerCards");
  const actionBar = document.getElementById("bjActionButtons");

  if (!dealBtn || !dealerRow || !playerRow) return;

  function makeCard(text = "", back = false) {
    const el = document.createElement("div");
    el.className = "bj-card" + (back ? " back" : "");
    el.textContent = back ? "" : text;
    return el;
  }

  function clearHands() {
    dealerRow.innerHTML = "";
    playerRow.innerHTML = "";
  }

  dealBtn.addEventListener("click", () => {
    clearHands();
    actionBar.classList.remove("hidden");
    playerRow.appendChild(makeCard("10"));
    playerRow.appendChild(makeCard("A"));
    dealerRow.appendChild(makeCard("9"));
    dealerRow.appendChild(makeCard("", true));
  });
})();