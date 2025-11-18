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

  function startRound() {
    resultTextEl.textContent = '';
    const bet = Number(betInput.value) || 0;
    if (bet <= 0) {
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

  function endRound() {
    if (!roundActive) return;

    dealerHidden = false;
    const playerTotal = handValue(playerHand);

    if (playerTotal <= 21) {
      dealerPlay();
    }
    updateUI();

    const dealerTotal = handValue(dealerHand);
    let msg = '';

    if (playerTotal > 21) {
      msg = 'You Busted. Dealer Wins!';
    } else if (dealerTotal > 21) {
      msg = "Dealer Busted. You Win!";
    } else if (playerTotal > dealerTotal) {
      msg = 'You Win!';
    } else if (playerTotal < dealerTotal) {
      msg = 'Dealer Wins!';
    } else {
      msg = 'Push (tie).';
    }

    resultTextEl.textContent = msg;
    setButtonsForRound(false);
  }

  function playerStand() {
    if (!roundActive) return;
    endRound();
  }

  // double only allowed on the starting hand
  function playerDouble() {
    if (!roundActive || playerHand.length !== 2) return;

    const currentBet = Number(betInput.value) || 0;
    betInput.value = currentBet * 2;

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

    dealerCardsEl  = document.getElementById("dealerCards");
    dealerScoreEl  = document.getElementById("dealerScore");
    playerCardsEl  = document.getElementById("playerCards");
    playerScoreEl  = document.getElementById("playerScore");
    betInput       = document.getElementById("bjBet");
    dealBtn        = document.getElementById("bjDealBtn");
    standBtn       = document.getElementById("bjStandBtn");
    doubleBtn      = document.getElementById("bjDoubleBtn");
    hitBtn         = document.getElementById("bjHitBtn");
    resultTextEl   = document.getElementById("bjResultText");
    actionBar      = document.getElementById("bjActionButtons");

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
