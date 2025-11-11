document.addEventListener('DOMContentLoaded', () => {
  const spinBtn = document.getElementById('slotSpin');
  const reelEls = [document.getElementById('reel1'), document.getElementById('reel2'), document.getElementById('reel3')];
  const betInput = document.getElementById('slotBet');
  const resultEl = document.getElementById('slotResult');

  // symbols array should match server symbols visually
  const SYMBOLS = ['🍒','🔔','🍋','⭐','7️⃣','💎'];

  function randomSymbol() {
    return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
  }

  // simple animation - cycles random symbols until stopped with final ones
    function startAnimation() {
    return reelEls.map((el, idx) => {
        return setInterval(() => {
        el.textContent = randomSymbol();
        }, 80 + idx * 30); // each reel spins at slightly different speeds
    });
    }

spinBtn.addEventListener('click', async () => {
    resultEl.textContent = '';
    const bet = parseFloat(betInput.value);
    if (!bet || bet <= 0) {
        resultEl.textContent = 'Enter a valid bet.';
        return;
    }
    spinBtn.disabled = true;

    // Start local animation immediately for UX
    const timers = startAnimation();

    try {
        const resp = await fetch('/api/slots/spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bet })
        });
        const data = await resp.json();

        if (!resp.ok) {
        timers.forEach(clearInterval);
        spinBtn.disabled = false;
        resultEl.textContent = data.error || 'Error playing.';
        return;
        }

        // 🎬 Stop reels one by one
        for (let i = 0; i < reelEls.length; i++) {
        await new Promise(r => setTimeout(r, 500)); // wait before stopping next reel
        clearInterval(timers[i]); // stop current reel
        reelEls[i].textContent = data.reels[i]; // show final symbol
        }

        // Show results
        if (data.payout > 0) {
        resultEl.textContent = `You won $${data.payout.toFixed(2)}! Balance: $${data.balance.toFixed(2)}`;
        } else {
        resultEl.textContent = `No win. Balance: $${data.balance.toFixed(2)}`;
        }

    } catch (err) {
        console.error(err);
        resultEl.textContent = 'Network or server error.';
    } finally {
        spinBtn.disabled = false;
    }
    });
});
