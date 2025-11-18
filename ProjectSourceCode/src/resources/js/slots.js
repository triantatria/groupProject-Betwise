document.addEventListener('DOMContentLoaded', () => {
  const spinBtn = document.getElementById('slotSpin');
  const reelEls = [document.getElementById('reel1'), document.getElementById('reel2'), document.getElementById('reel3')];
  const betInput = document.getElementById('slotBet');
  const resultEl = document.getElementById('slotResult');

  // symbols array should match server symbols visually
  const SYMBOLS = ['🍒', '🔔', '🍋', '⭐', '7️⃣', '💎'];

  function randomSymbol() {
    return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
  }

  // ---------------- BROWSER BALANCE ----------------
  /*if (!localStorage.getItem('balance')) {
    localStorage.setItem('balance', '1000');
  }
*/

  /*function getBalance() {
    return parseFloat(localStorage.getItem('balance'));
  }
  */

  /*
  function setBalance(newBalance) {
    localStorage.setItem('balance', newBalance);
  }
  */

  // Balance from Server Session
  let currentBalance = window.initialBalance ?? 0;

  // Show balance at the top of the page
  const balanceEl = document.createElement('p');
  balanceEl.id = 'slotBalance';
  balanceEl.style.textAlign = 'center';
  balanceEl.style.fontWeight = 'bold';
  balanceEl.textContent = `Balance: $${currentBalance.toFixed(2)}`;
  const container = document.querySelector('.slots-container') || document.body;
  container.prepend(balanceEl);
  // ---------------- ANIMATION ----------------
  function startAnimation() {
    return reelEls.map((el, idx) => {
      return setInterval(() => {
        el.textContent = randomSymbol();
      }, 80 + idx * 30);
    });
  }

  // ---------------- SPIN BUTTON ----------------
  spinBtn.addEventListener('click', async () => {
    resultEl.textContent = '';
    const bet = parseFloat(betInput.value);

    if (!bet || bet <= 0) {
      resultEl.textContent = 'Enter a valid bet.';
      return;
    }

    //const currentBalance = getBalance();
    if (bet > currentBalance) {
      resultEl.textContent = `You only have $${currentBalance.toFixed(2)} available to bet`;
      return;
    }

    spinBtn.disabled = true;
    const timers = startAnimation();

    try {
      // Call backend; backend decides reels + payout + newBalance
      const res = await fetch('/slots/spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bet })
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || 'Server error processing spin.');
      }

      const { reels, payout, newBalance } = data;

      /* Calculate payout
      const [a, b, c] = reels;
      let payout = 0;
      */


      /*
      if (a === b && b === c) {
        if (a === '💎') payout = bet * 10;
        else if (a === '🍒') payout = bet * 3;
        else payout = bet * 2;
      } else if (a === b || b === c || a === c) {
        payout = bet * 2;
      } else {
        payout = 0;
      }
        */


      // Stop reels one by one
      for (let i = 0; i < reelEls.length; i++) {
        await new Promise(r => setTimeout(r, 500));
        clearInterval(timers[i]);
        reelEls[i].textContent = reels[i];
      }

      /* Update and display balance
      const newBalance = currentBalance - bet + payout;
      setBalance(newBalance);
      balanceEl.textContent = `Balance: $${newBalance.toFixed(2)}`;
      */

      // Update current balance from server
      currentBalance = newBalance;
      balanceEl.textContent = `Balance: $${currentBalance.toFixed(2)}`;

      // Display balance change
      if (payout > 0) {
        resultEl.textContent = `You won $${payout.toFixed(2)}!`;
      } else {
        resultEl.textContent = `No win.`;
      }

    } catch (err) {
      console.error(err);
      resultEl.textContent = err.message || 'Network or server error.';
    } finally {
      spinBtn.disabled = false;
    }
  });
});

document.addEventListener("DOMContentLoaded", () => {
  const details = document.querySelector(".slot-rules");
  if (!details) return;

  const summary = details.querySelector(".rules-summary");
  const closedText = summary.dataset.closedText;
  const openText = summary.dataset.openText;

  details.addEventListener("toggle", () => {
    summary.textContent = details.open ? openText : closedText;
  });
});