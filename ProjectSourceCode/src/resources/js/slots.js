//  SLOTS GAME LOGIC
document.addEventListener('DOMContentLoaded', () => {
  const spinBtn  = document.getElementById('slotSpin');
  const reelEls  = [
    document.getElementById('reel1'),
    document.getElementById('reel2'),
    document.getElementById('reel3'),
  ];
  const betInput = document.getElementById('slotBet');
  const resultEl = document.getElementById('slotResult');

  // If key elements are missing, then stop
  if (!spinBtn || reelEls.some(r => !r) || !betInput || !resultEl) {
    return;
  }

  // read navbar balance if needed
  function readNavBalance() {
    const navEl = document.getElementById('balance');
    if (!navEl) return 0;
    const match = (navEl.textContent || '').match(/([\d.]+)/);
    return match ? Number(match[1]) : 0;
  }

  // Get starting balance from server (fallback to navbar if fails)
  let currentBalance =
    typeof window.initialBalance === 'number'
      ? window.initialBalance
      : readNavBalance();

  const SYMBOLS = ['🍒', '🔔', '🍋', '⭐', '7️⃣', '💎'];

  // Update navbar balance
  function updateHeaderBalance(newBalance) {
    const el = document.getElementById('balance');
    const n = Number(newBalance);
    if (el && Number.isFinite(n)) {
      el.textContent = `$${n}`;
    }
  }

  // Reel animation
  function startAnimation() {
    return reelEls.map((el, idx) => {
      return setInterval(() => {
        el.textContent = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
      }, 80 + idx * 30);
    });
  }

  // Spin button
  spinBtn.addEventListener('click', async () => {
    resultEl.textContent = '';
    const bet = Number(betInput.value);

    // Make sure bet is valid
    if (!bet || bet <= 0) {
      resultEl.textContent = 'Enter a valid bet.';
      return;
    }
    if (bet > currentBalance) {
      resultEl.textContent = `You only have $${currentBalance}`;
      return;
    }

    spinBtn.disabled = true;

    // Start animation
    reelEls.forEach(el => el.classList.add('spin'));
    const timers = startAnimation();

    try {
      const response = await fetch('/slots/spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bet }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        resultEl.textContent = data.error || 'Server error.';
        timers.forEach(t => clearInterval(t));
        spinBtn.disabled = false;
        return;
      }

      const data = await response.json();
      const { reels, payout, newBalance } = data;

      // Stop reels one-by-one instead of all together
      for (let i = 0; i < reelEls.length; i++) {
        await new Promise(r => setTimeout(r, 250));
        clearInterval(timers[i]);
        reelEls[i].textContent = reels[i];
        reelEls[i].classList.remove('spin');
      }

      // Update balances
      currentBalance = newBalance;
      updateHeaderBalance(newBalance);

      const pageBalance = document.querySelector('.bj-balance');
      if (pageBalance) {
        pageBalance.textContent = `Balance: $${newBalance}`;
      }

      resultEl.textContent =
        payout > 0 ? `You won $${payout}!` : 'No win.';
      
    } catch (err) {
      console.error(err);
      resultEl.textContent = 'Network or server error.';
      timers.forEach(t => clearInterval(t));
    } finally {
      spinBtn.disabled = false;
      reelEls.forEach(el => el.classList.remove('spin'));
    }
  });
});

// slot rules dropdown
document.addEventListener('DOMContentLoaded', () => {
  const details = document.querySelector('.slot-rules');
  if (!details) return;

  const summary    = details.querySelector('.rules-summary');
  const closedText = summary.dataset.closedText;
  const openText   = summary.dataset.openText;

  details.addEventListener('toggle', () => {
    summary.textContent = details.open ? openText : closedText;
  });
});