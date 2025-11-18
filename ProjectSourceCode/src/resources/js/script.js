/* Page transition  */
function startHomeTransition() {
  const overlay = document.getElementById("page-transition");
  if (!overlay) return;
  overlay.classList.add("active");
  setTimeout(() => location.href = "/home", 700);
}

/* Mines */
/*const grid = document.getElementById("minesGrid");
if (grid) {
  for (let i = 0; i < 25; i++) {
    const tile = document.createElement("div");
    tile.classList.add("mine-tile");
    tile.addEventListener("click", () => tile.classList.toggle("mine-safe"));
    grid.appendChild(tile);
  }
}*/



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
/*(function initBlackjackUI() {
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
})();*/





// Global client-side scripts

document.addEventListener('DOMContentLoaded', () => {
  const registerForm = document.getElementById('registerForm');
  if (!registerForm) return; // not on the register page

  const passwordInput = document.getElementById('password');

  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

  registerForm.addEventListener('submit', (e) => {
    const pwd = passwordInput.value;

    if (!passwordRegex.test(pwd)) {
      e.preventDefault();
      alert(
        'Password must be at least 8 characters and include uppercase, lowercase, a number, and a special character.'
      );
    }
  });
});
