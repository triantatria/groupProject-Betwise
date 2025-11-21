document.addEventListener('DOMContentLoaded', () => {
  const spinBtn = document.getElementById('slotSpin');
  const reelEls = [
    document.getElementById('reel1'),
    document.getElementById('reel2'),
    document.getElementById('reel3'),
  ];
  const betInput = document.getElementById('slotBet');
  const resultEl = document.getElementById('slotResult');
  const balanceEl = document.getElementById('slotBalance');

  if (!spinBtn || reelEls.some(r => !r) || !betInput || !resultEl || !balanceEl) {
    return;
  }

  function parseBalanceFromText() {
    const text = balanceEl.textContent || '';
    const match = text.match(/([\d.]+)/);
    return match ? parseFloat(match[1]) : 0;
  }

  let currentBalance = parseBalanceFromText();

  const SYMBOLS = ['🍒', '🔔', '🍋', '⭐', '7️⃣', '💎'];

  function startAnimation() {
    return reelEls.map((el, idx) => {
      return setInterval(() => {
        const sym = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
        el.textContent = sym;
      }, 80 + idx * 30);
    });
  }

  function updateBalanceDisplay(newBalance) {
    currentBalance = newBalance;
    balanceEl.textContent = `Balance: $${newBalance}`;
  }

  spinBtn.addEventListener('click', async () => {
    resultEl.textContent = '';
    const bet = parseFloat(betInput.value);

    if (!bet || bet <= 0) {
      resultEl.textContent = 'Enter a valid bet.';
      return;
    }

    if (bet > currentBalance) {
      resultEl.textContent = `You only have $${currentBalance}`;
      return;
    }

    spinBtn.disabled = true;
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
        return;
      }

      const data = await response.json();
      const { reels, payout, newBalance } = data;

      for (let i = 0; i < reelEls.length; i++) {
        await new Promise(r => setTimeout(r, 400));
        clearInterval(timers[i]);
        reelEls[i].textContent = reels[i];
      }

      updateBalanceDisplay(newBalance);

      resultEl.textContent = payout > 0
        ? `You won $${payout}!`
        : 'No win.';
    } catch (err) {
      console.error(err);
      resultEl.textContent = 'Network or server error.';
    } finally {
      timers.forEach(t => clearInterval(t));
      spinBtn.disabled = false;
    }
  });
});

document.addEventListener('DOMContentLoaded', () => {
  const details = document.querySelector('.slot-rules');
  if (!details) return;

  const summary = details.querySelector('.rules-summary');
  const closedText = summary.dataset.closedText;
  const openText = summary.dataset.openText;

  details.addEventListener('toggle', () => {
    summary.textContent = details.open ? openText : closedText;
  });
});