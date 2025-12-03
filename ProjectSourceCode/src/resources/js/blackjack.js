// BlackJack Logic // 
const Blackjack = (() => {
  const suits = ['spade', 'heart', 'diamond', 'club'];
  const ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const suitSymbols = {
    spade: '♠',
    heart: '♥',
    diamond: '♦',
    club: '♣'
  };

  let currentBet = 0;

  function updateHeaderBalance(newBalance) {
    const el = document.getElementById('balance');
    const n = Number(newBalance);
    //Update header balance if valid
    if (el && Number.isFinite(n)) {
      el.textContent = `$${n}`;
    }

    //Update blackjack page balance if valid
    const bjEl = document.getElementById('bjBalanceValue');
    if (bjEl && Number.isFinite(n)) {
      bjEl.textContent = `${n}`;
    }

  }


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
    for (const suit of suits) {
      for (const rank of ranks) {
        d.push({ rank, suit });
      }
    }
    return d;
  }

  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  // deal one card
  function dealCard() {
    return deck.pop();
  }

  function cardValue(card) {
    if (card.rank === 'A') return 11;
    if (['K', 'J', 'Q'].includes(card.rank)) return 10;
    return Number(card.rank);
  }

  function handValue(hand) {
    let total = 0;
    let aces = 0;
    for (const card of hand) {
      total += cardValue(card);
      if (card.rank === 'A') aces++;
    }
    // downgrade aces if bust
    while (total > 21 && aces > 0) {
      total -= 10;
      aces--;
    }
    return total;
  }

  // rendering
  function renderHand(container, hand, hideFirstCard) {
    container.innerHTML = '';

    hand.forEach((card, index) => {
      const el = document.createElement("div");
      el.className = "bj-card";

      if (hideFirstCard && index === 0) {
        el.classList.add("back");
        el.textContent = "";
      } else {
        el.textContent = `${card.rank}${suitSymbols[card.suit]}`;
      }
      container.appendChild(el);
    });
  }

  function updateScores() {
    const playerTotal = handValue(playerHand);
    playerScoreEl.textContent = `Score: ${playerTotal}`;
    if (dealerHidden) {
      dealerScoreEl.textContent = 'Score: ?';
    } else {
      const dealerTotal = handValue(dealerHand);
      dealerScoreEl.textContent = `Score: ${dealerTotal}`;
    }
  }

  function updateUI() {
    renderHand(playerCardsEl, playerHand, false);
    renderHand(dealerCardsEl, dealerHand, dealerHidden);
    updateScores();
  }

  // IMPORTANT: let DEAL be enabled when round is NOT active
  function setButtonsForRound(active) {
    roundActive = active;
    if (!hitBtn || !standBtn || !dealBtn || !doubleBtn) return;

    hitBtn.disabled = !active;
    standBtn.disabled = !active;
    doubleBtn.disabled = !active;
    dealBtn.disabled = active; // only disable Deal during an active round

    if (actionBar) {
      if (active) {
        actionBar.classList.remove("hidden");
      } else {
        actionBar.classList.add("hidden");
      }
    }
  }

  // Game Flow

  async function startRound() {
    resultTextEl.textContent = '';
    const bet = Number(betInput.value) || 0;
    if (bet <= 0) {
      resultTextEl.textContent = 'Enter in a valid bet before you play';
      return;
    }
    try {
      const res = await fetch('/blackjack/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bet })
      });
      const data = await res.json();
      if (!res.ok || data.error || !data.ok) {
        console.error('Blackjack start payload: ', data);
        resultTextEl.textContent = data.error || 'Error placing bet';
        return;
      }
      currentBet = bet;
      updateHeaderBalance(data.newBalance);

    } catch (err) {
      console.error('Blackjack start error: ', err);
      resultTextEl.textContent = 'Network error starting Blackjack round';
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
    if (playerTotal === 21 || dealerTotal === 21) {
      endRound();
    }
  }

  function playerHit() {
    if (!roundActive) return;

    playerHand.push(dealCard());
    updateUI();

    if (handValue(playerHand) > 21) {
      endRound();
    }
  }

  function dealerPlay() {
    while (handValue(dealerHand) < 17) {
      dealerHand.push(dealCard());
    }
  }

  async function endRound() {
    if (!roundActive) return;

    dealerHidden = false;
    const playerTotal = handValue(playerHand);

    if (playerTotal <= 21) {
      dealerPlay();
    }
    updateUI();


    const dealerTotal = handValue(dealerHand);
    let msg = '';
    let result = 'loss';
    let netPayout = 0;

    // determine outcome
    if (playerTotal > 21) {
      msg = 'You Busted. Dealer Wins!';
      result = 'loss';
      netPayout = 0;
    } else if (dealerTotal > 21) {
      msg = "Dealer Busted. You Win!";
      result = 'win';
      netPayout = currentBet * 2;
    } else if (playerTotal > dealerTotal) {
      msg = 'You Win!';
      result = 'win';
      netPayout = currentBet * 2;
    } else if (playerTotal < dealerTotal) {
      msg = 'Dealer Wins!';
      result = 'loss';
      netPayout = 0;
    } else {
      msg = 'Push (tie).';
      result = 'push';
      netPayout = currentBet;
    }

    resultTextEl.textContent = msg;
    setButtonsForRound(false);

    // inform server of round result/tell server to settle round
    try {
      const res = await fetch('/blackjack/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result, netPayout })
      });
      const data = await res.json();
      if (!res.ok || data.error || !data.ok) {
        console.error('Blackjack settle payload: ', data);
        return;
      }
      updateHeaderBalance(data.newBalance);

    } catch (err) {
      console.error('Blackjack settle error: ', err);
      return;
    }
  }

  function playerStand() {
    if (!roundActive) return;
    endRound();
  }

  // double only allowed on the starting hand
  async function playerDouble() {
    if (!roundActive || playerHand.length !== 2) return;

    const extraBet = currentBet || Number(betInput.value) || 0;
    if (extraBet <= 0) {
      resultTextEl.textContent = 'Cannot double with zero bet';
      return;
    }

    //Ask server to subtract extra bet
    try {
      const res = await fetch('/blackjack/double', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extraBet })
      });
      const data = await res.json();

      if (!res.ok || data.error || !data.ok) {
        console.error('Blackjack double bet payload: ', data);
        resultTextEl.textContent = data.error || 'Error placing double bet';
        return;
      }

      //Server accepted extra bet
      currentBet += extraBet;
      betInput.value = currentBet;
      updateHeaderBalance(data.newBalance);


    } catch (err) {
      console.error('Blackjack double fetch error: ', err);
      resultTextEl.textContent = 'Network error placing double bet';
      return;
    }

    playerHand.push(dealCard());
    updateUI();

    if (handValue(playerHand) > 21) {
      endRound();
    } else {
      playerStand();
    }
  }

  // init
  function init() {
    // only run on blackjack page
    const blackjackMain = document.querySelector('.blackjack-container');
    if (!blackjackMain) return;

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
    dealerScoreEl.textContent = 'Score: —';
    playerScoreEl.textContent = 'Score: —';
  }

  return { init };
})();

// init blackjack when DOM is ready (on pages that include this file)
document.addEventListener("DOMContentLoaded", () => {
  Blackjack.init();
});