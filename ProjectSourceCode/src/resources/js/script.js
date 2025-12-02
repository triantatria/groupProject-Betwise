/* Home Transition */
function runTransitionPageEffects() {
  if (!document.body.classList.contains("transition-page")) return;

  // Fade-out after delay
  setTimeout(() => {
    document.body.classList.add("fade-out");
  }, 2500);

  // Navigate to home after fade
  setTimeout(() => {
    window.location.href = "/home";
  }, 5000); 
}

/* Game Transition */
function fadeNavigate(url) {
  document.body.classList.add("fade-out");
  setTimeout(() => {
    window.location.href = url;
  }, 600); // match fadeOut animation
}

/* Button Tranistion */
document.addEventListener("DOMContentLoaded", () => {
  runTransitionPageEffects();

  const navButtons = document.querySelectorAll("[data-nav]");
  navButtons.forEach(btn => {
    btn.addEventListener("click", e => {
      e.preventDefault();
      fadeNavigate(btn.getAttribute("data-nav"));
    });
  });
});

/* Register Tranistion */

document.addEventListener("DOMContentLoaded", () => {
  const wrapper = document.getElementById("auth-wrapper");

  wrapper.classList.add("fade-in");

  document.querySelectorAll("a[data-fade]").forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
      wrapper.classList.remove("fade-in");
      wrapper.classList.add("fade-out");

      setTimeout(() => {
        window.location = link.href;
      }, 280);
    });
  });
});

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
// mines logic

/*const Mines = (() => {
  const GRID_SIZE = 25;        // 5x5
  const DEFAULT_MINES = 5;     // number of mines for now

  let gridEl;
  let tiles = [];              // { el, isMine, revealed }
  let numMines = DEFAULT_MINES;
  let roundActive = false;

  // Optional UI elements (only used if present)
  let statusEl;   // e.g. <div id="minesStatus"></div>
  let resetBtn;   // e.g. <button id="minesResetBtn">New Round</button>

  function init() {
    gridEl = document.getElementById("minesGrid");
    if (!gridEl) return; // not on mines page

    statusEl = document.getElementById("minesStatus");
    resetBtn = document.getElementById("minesResetBtn");

    buildGrid();
    newRound();

    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        newRound();
      });
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

    // reset all tiles
    tiles.forEach(tile => {
      tile.isMine = false;
      tile.revealed = false;
      tile.el.classList.remove("mine-safe", "mine-bomb", "mine-hit", "mine-disabled");
      tile.el.textContent = ""; // if you want emojis/text later
    });

    if (statusEl) {
      statusEl.textContent = "New round! Avoid the mines.";
    }

    placeMines();
  }

  // this is the main "randomization" function
  function placeMines() {
    // pick numMines distinct random indices
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
      // hit a mine → lose round
      tile.el.classList.add("mine-bomb", "mine-hit");
      if (statusEl) statusEl.textContent = "Boom! You hit a mine.";
      revealAllMines();
      endRound();
    } else {
      tile.el.classList.add("mine-safe");
      // you could track score / multiplier here
      if (statusEl) statusEl.textContent = "Safe! Keep going or cash out.";
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
*/

// mines logic

const Mines = (() => {
  const GRID_SIZE = 25;        // 5x5
  const DEFAULT_MINES = 5;     // number of mines for now

  let gridEl;
  let tiles = [];              // { el, isMine, revealed }
  let numMines = DEFAULT_MINES;
  let roundActive = false;

  // Optional UI elements (only used if present)
  let statusEl;   // e.g. <div id="minesStatus"></div>
  let resetBtn;   // e.g. <button id="minesResetBtn">New Round</button>

  function init() {
    gridEl = document.getElementById("minesGrid");
    if (!gridEl) return; // not on mines page

    statusEl = document.getElementById("minesStatus");
    resetBtn = document.getElementById("minesResetBtn");

    buildGrid();
    newRound();

    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        newRound();
      });
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

    // reset all tiles
    tiles.forEach(tile => {
      tile.isMine = false;
      tile.revealed = false;
      tile.el.classList.remove("mine-safe", "mine-bomb", "mine-hit", "mine-disabled");
      tile.el.textContent = ""; // if you want emojis/text later
    });

    if (statusEl) {
      statusEl.textContent = "New round! Avoid the mines.";
    }

    placeMines();
  }

  // this is the main "randomization" function
  function placeMines() {
    // pick numMines distinct random indices
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
      // hit a mine → lose round
      tile.el.classList.add("mine-bomb", "mine-hit");
      if (statusEl) statusEl.textContent = "Boom! You hit a mine.";
      revealAllMines();
      endRound();
    } else {
      tile.el.classList.add("mine-safe");
      // you could track score / multiplier here
      if (statusEl) statusEl.textContent = "Safe! Keep going or cash out.";
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

// BlackJack Logic // 
const Blackjack = (() => {
  const suits = ['spade', 'heart', 'diamond', 'club'];
  const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

  let deck = [];
  let playerHand = [];
  let dealerHand = [];
  let roundActive = false;
  let dealerHidden = true;

  let dealerCardsEl, dealerScoreEl;
  let playerCardsEl, playerScoreEl;
  let betInput, dealBtn, hitBtn, standBtn, doubleBtn, resultTextEl, actionBar;

  // deck
  function buildDeck() {
    const d = [];
    for (const suit of suits){
      for (const rank of ranks){
        d.push({ rank, suit })
      }
    }
    return d;
  }
  function shuffle(array){
    for(let i = array.length - 1; i > 0; i--){
      const j = Math.floor(Math.random() * (i+1));
      [array[i],array[j]] = [array[j],array[i]];
    }
  }
  //deal one card function
  function dealCard(){
    return deck.pop();
  }
  function cardValue(card){
    if(card.rank === 'A') return 11;
    if(['K', 'J', 'Q'].includes(card.rank)) return 10;
    return Number(card.rank);
  }
  function handValue(hand){
    let total = 0; 
    let aces = 0;
    for(const card of hand){
      total += cardValue(card);
      if(card.rank === 'A') aces++;
    }
    //downgrade aces if bust
    while(total > 21 && aces > 0){
      total -= 10;
      aces--;
    }
    return total;
  }

  //rendering
  function renderHand(container, hand, hideFirstCard) {
    container.innerHTML = '';

    hand.forEach((card, index) => {
      const el = document.createElement("div");
      el.className = "bj-card";

      if(hideFirstCard && index === 0){
        el.classList.add("back");
        el.textContent = "";

      } else {
        el.textContent = `${card.rank}${card.suit}`;
      }
      container.appendChild(el);
  });
}
function updateScores() {
  const playerTotal = handValue(playerHand);
  playerScoreEl.textContent = `Score: ${playerTotal}`;
  if(dealerHidden){
    dealerScoreEl.textContent = 'Score: ?';
  } else {
    const dealerTotal = handValue(dealerHand);
    dealerScoreEl.textContent = `Score: ${dealerTotal}`;
  }
}
function updateUI(){
  renderHand(playerCardsEl, playerHand, false);
  renderHand(dealerCardsEl, dealerHand, dealerHidden);
  updateScores();
}
function setButtonsForRound(active) {
  roundActive = active;
  if(!hitBtn||!standBtn||!dealBtn||!doubleBtn) return;
  hitBtn.disabled = !active;
  standBtn.disabled = !active;
  dealBtn.disabled = !active;
  doubleBtn.disabled = !active;

  //actionbar when round is active
  if(actionBar && active) {
    actionBar.classList.remove("hidden");
  }
}

// Game Flow

function startRound(){
  resultTextEl.textContent = '';
  const bet = Number(betInput.value) || 0;
  if(bet<=0){
    resultTextEl.textContent = 'Enter a bet before you play';
    return;
  }
  deck = buildDeck();
  shuffle(deck);
  playerHand = [];
  dealerHand = [];
  dealerHidden = true;

  // player, dealer, player, dealer
  playerHand.push(dealCard());
  dealerHand.push(dealCard());
  playerHand.push(dealCard());
  dealerHand.push(dealCard());

  setButtonsForRound(true);
  updateUI();
  const playerTotal = handValue(playerHand);
  const dealerTotal = handValue(dealerHand);

  // check for blackjack off the bat

  if(playerTotal === 21 || dealerTotal === 21){
    endRound();
  }
}
function playerHit() {
  if(!roundActive) return;

  playerHand.push(dealCard());
  updateUI();

  if(handValue(playerHand) > 21) {
    endRound();
  }
}
function dealerPlay() {
  while(handValue(dealerHand) < 17){
    dealerHand.push(dealCard());
  }
}
function endRound() {
  if(!roundActive) return;
  dealerHidden = false;
  const playerTotal = handValue(playerHand);
  if(playerTotal <= 21) {
    dealerPlay();
  }
  updateUI();

  const dealerTotal = handValue(dealerHand);
  let msg = '';

  if(playerTotal > 21){
    msg = 'You Busted. Dealer Wins!';
  } else if (dealerTotal > 21){
    msg = "Dealer Busted. You Win!";
  } else if (playerTotal > dealerTotal) {
    msg = 'You Win!';
  } else if (playerTotal < dealerTotal){
    msg = 'Dealer Wins!';
  } else {
    msg = 'Push (tie).'
  }

  resultTextEl.textContent = msg;
  setButtonsForRound(false);
}

function playerStand() {
  if(!roundActive) return;
  endRound();
}

// double only allowed on the starting hand
function playerDouble() {

  if (!roundActive || playerHand.length !== 2) return;

  const currentBet = Number(betInput.value) || 0;
  betInput.value = currentBet * 2;

  playerHand.push(dealCard());
  updateUI();

  if(handValue(playerHand) > 21) {
    endRound();
  } else {
    playerStand();
  }
}

// init


function init(){
  //only run on blackjack page
  const blackjackMain = document.querySelector('.blackjack-container');
  if(!blackjackMain) return;

  dealerCardsEl = document.getElementById("dealerCards");
  dealerScoreEl = document.getElementById("dealerScore");
  playerCardsEl = document.getElementById("playerCards");
  playerScoreEl = document.getElementById("playerScore");
  betInput = document.getElementById("bjBet");
  dealBtn = document.getElementById("bjDealBtn");
  standBtn = document.getElementById("bjStandBtn");
  doubleBtn = document.getElementById("bjDoubleBtn");
  hitBtn = document.getElementById("bjHitBtn");
  resultTextEl = document.getElementById("bjResultText");
  actionBar = document.getElementById("bjActionButtons");

  if (!dealBtn || !dealerCardsEl || !playerCardsEl) return;

  dealBtn.addEventListener("click", startRound);
  hitBtn.addEventListener("click", playerHit);
  standBtn.addEventListener("click", playerStand);
  doubleBtn.addEventListener("click", playerDouble);

  setButtonsForRound(false);
  dealerScoreEl.textContent = 'Score: -';
  dealerScoreEl.textContent = 'Score: -';

}
return { init };
})();

// init blackjack when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  Blackjack.init();
  Mines.init();
});




