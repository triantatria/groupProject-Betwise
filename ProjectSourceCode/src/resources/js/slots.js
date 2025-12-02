// slots.js
document.addEventListener('DOMContentLoaded', () => {
  const spinBtn  = document.getElementById('slotSpin');
  const reelEls  = [
    document.getElementById('reel1'),
    document.getElementById('reel2'),
    document.getElementById('reel3'),
  ];
  const betInput = document.getElementById('slotBet');
  const resultEl = document.getElementById('slotResult');

  // If key elements are missing, do nothing
  if (!spinBtn || reelEls.some(r => !r) || !betInput || !resultEl) {
    return;
  }

  // Helper: parse the nav balance if window.initialBalance is missing
  function readNavBalance() {
    const navEl = document.getElementById('balance');
    if (!navEl) return 0;

    const text = navEl.textContent || '';
    const match = text.match(/([\d.]+)/);
    return match ? Number(match[1]) : 0;
  }

  // Start balance from server or from nav
  let currentBalance =
    typeof window.initialBalance === 'number'
      ? window.initialBalance
      : readNavBalance();

  const SYMBOLS = ['🍒', '🔔', '🍋', '⭐', '7️⃣', '💎'];

  // Update nav header balance (the one in the navbar)
  function updateHeaderBalance(newBalance) {
    const el = document.getElementById('balance');
    const n = Number(newBalance);
    if (el && Number.isFinite(n)) {
      el.textContent = `$${n}`;
    }
  }

  // Reel spin animation
  function startAnimation() {
    return reelEls.map((el, idx) => {
      return setInterval(() => {
        const sym = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
        el.textContent = sym;
      }, 80 + idx * 30);
    });
  }

  // ---------------- SPIN BUTTON ----------------
  spinBtn.addEventListener('click', async () => {
    resultEl.textContent = '';
    const bet = Number(betInput.value);

    // Validate bet first
    if (!bet || bet <= 0) {
      resultEl.textContent = 'Enter a valid bet.';
      return;
    }

    if (bet > currentBalance) {
      resultEl.textContent = `You only have $${currentBalance}`;
      return;
    }

    spinBtn.disabled = true;

    // Start animation and add CSS spin class
    reelEls.forEach(el => el.classList.add('spin'));
    const timers = startAnimation();

    try {
      const response = await fetch('/slots/spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bet }),
      });

      // Handle HTTP errors
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        resultEl.textContent = data.error || 'Server error.';
        timers.forEach(t => clearInterval(t));
        spinBtn.disabled = false;
        return;
      }

      const data = await response.json();
      const { reels, payout, newBalance } = data;

      // Smoothly stop reels one by one
      for (let i = 0; i < reelEls.length; i++) {
        await new Promise(r => setTimeout(r, 250)); // stagger stop
        clearInterval(timers[i]);
        reelEls[i].textContent = reels[i];
        reelEls[i].classList.remove('spin'); // remove CSS spin class
      }

      // Update our local balance + nav header
      currentBalance = newBalance;
      updateHeaderBalance(newBalance);

      resultEl.textContent = payout > 0
        ? `You won $${payout}!`
        : 'No win.';

    } catch (err) {
      console.error(err);
      resultEl.textContent = 'Network or server error.';
      timers.forEach(t => clearInterval(t));
    } finally {
      spinBtn.disabled = false;
      // ensure all reels have spin class removed
      reelEls.forEach(el => el.classList.remove('spin'));
    }
  });


});

// Rules <details> toggle text
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
