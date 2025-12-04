// *****************************************************
// Section 1 : Import Dependencies
// *****************************************************

const express = require('express');
const app = express();
const handlebars = require('express-handlebars');
const Handlebars = require('handlebars');
const path = require('path');
const pgp = require('pg-promise')();
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const DAILY_CREDIT_LIMIT = 5000;

// *****************************************************
// Section 2 : Connect to DB
// *****************************************************

const hbs = handlebars.create({
  extname: 'hbs',
  layoutsDir: __dirname + '/views/layouts',
  partialsDir: __dirname + '/views/partials',
  defaultLayout: 'main',
});

hbs.handlebars.registerHelper('inc', value => Number(value) + 1);

const dbConfig = {
  host: process.env.HOST,
  port: 5432,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
};

const db = pgp(dbConfig);

db.connect()
  .then(obj => {
    console.log('Database connection successful');
    obj.done();
  })
  .catch(err => console.log('ERROR:', err.message || err));

// *****************************************************
// Section 3 : App Settings
// *****************************************************

app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

app.use('/resources', express.static(path.join(__dirname, 'resources')));
app.use('/resources', express.static(path.join(__dirname, '..', 'resources')));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev_secret_key',
    saveUninitialized: false,
    resave: false,
  })
);

// *****************************************************
// Auth Middleware
// *****************************************************

function requireAuth(req, res, next) {
  if (!req.session.user) return res.redirect('/');
  next();
}

// *****************************************************
// Helper Functions
// *****************************************************

function friendlyType(code) {
  switch (code) {
    case 'wallet_add': return 'Add Credits';

    case 'Slots Spin': return 'Slots Spin';
    case 'Slots Win': return 'Slots Win';

    case 'Blackjack Bet': return 'Blackjack Bet';
    case 'Blackjack Win': return 'Blackjack Win';
    case 'Blackjack Loss': return 'Blackjack Loss';
    case 'Blackjack Push': return 'Blackjack Push (Tie)';
    case 'Blackjack Double': return 'Blackjack Double Down';
    case 'Blackjack Result': return 'Blackjack Result';

    case 'Mines Bet': return 'Mines Bet';
    case 'Mines Win': return 'Mines Win';
    case 'Mines Loss': return 'Mines Loss';
    case 'Mines Cashout': return 'Mines Cashout';
    case 'Mines Tile Reward': return 'Mines Safe Tile';

    default: return code;
  }
}

async function getUserTransactions(userId) {
  const rows = await db.any(
    `SELECT type, amount, created_at
     FROM transactions
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 20`,
    [userId]
  );

  return rows.map(r => ({
    type: friendlyType(r.type),
    amount: Math.abs(Number(r.amount)),
    amountPositive: Number(r.amount) > 0,
    date: r.created_at.toISOString().slice(0, 10),
  }));
}

// Expose user + balance to all templates
app.use((req, res, next) => {
  if (req.session.user) {
    const b = Number(req.session.user.balance);
    req.session.user.balance = Number.isFinite(b) ? b : 0;

    res.locals.user = req.session.user;
    res.locals.balance = req.session.user.balance;
  } else {
    res.locals.user = null;
    res.locals.balance = null;
  }
  next();
});

function defaultBackgroundLayers(dim = false) {
  if (dim) {
    return [
      'neon-clouds dim',
      'caustics softer',
      'bloom-overlay subtle',
      'neon-dots',
    ];
  }
  return [
    'neon-clouds',
    'caustics',
    'particles',
    'glow-ripple',
    'bloom-overlay',
    'neon-dots',
  ];
}

function renderLoginPage(res, extra = {}) {
  res.render('pages/login', {
    title: 'Login',
    pageClass: 'login-page',
    backgroundLayers: defaultBackgroundLayers(false),
    titleText: 'BETWISE',
    subtitleText: 'Flow With The Odds',
    hideFooter: true,
    ...extra,
  });
}

// *****************************************************
// Auth Routes
// *****************************************************

app.get('/', (req, res) =>
  req.session.user ? res.redirect('/home') : renderLoginPage(res)
);

app.get('/login', (req, res) =>
  req.session.user ? res.redirect('/home') : renderLoginPage(res)
);

app.post('/login', async (req, res) => {
  let { username, password } = req.body;

  username = (username || '').trim();
  password = (password || '').trim();

  if (!username || !password) {
    return renderLoginPage(res, {
      error: true,
      message: 'Invalid username or password.',
    });
  }

  try {
    const user = await db.oneOrNone(
      'SELECT user_id, username, password_hash, balance FROM users WHERE username = $1',
      [username]
    );

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return renderLoginPage(res, {
        error: true,
        message: 'Invalid username or password.',
      });
    }

    req.session.user = {
      user_id: user.user_id,
      username: user.username,
      balance: user.balance || 0,
    };

    return res.redirect('/transition');
  } catch (err) {
    console.error('Login error:', err);
    return renderLoginPage(res, {
      error: true,
      message: 'Something went wrong.',
    });
  }
});

// REGISTER
app.get('/register', (req, res) => {
  if (req.session.user) return res.redirect('/home');

  res.render('pages/register', {
    title: 'Register',
    pageClass: 'register-page',
    hideFooter: true,
    backgroundLayers: defaultBackgroundLayers(false),
  });
});

app.post('/register', async (req, res) => {
  let { fname, lname, email, username, password } = req.body;

  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).render('pages/register', {
      error: true,
      message: 'Invalid input.',
      pageClass: 'register-page',
      backgroundLayers: defaultBackgroundLayers(false),
    });
  }

  const cleanUsername = username.trim();
  const cleanPassword = password.trim();

  if (!cleanUsername || !cleanPassword) {
    return res.status(400).render('pages/register', {
      error: true,
      message: 'All fields required.',
      pageClass: 'register-page',
      backgroundLayers: defaultBackgroundLayers(false),
    });
  }

  try {
    const exists = await db.oneOrNone(
      'SELECT user_id FROM users WHERE username=$1',
      [cleanUsername]
    );

    if (exists) {
      return res.render('pages/register', {
        error: true,
        message: 'Username already taken.',
        pageClass: 'register-page',
        backgroundLayers: defaultBackgroundLayers(false),
      });
    }

    const hashed = await bcrypt.hash(cleanPassword, 10);

    await db.one(
      `INSERT INTO users (fname, lname, email, username, password_hash)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING user_id`,
      [fname, lname, email, cleanUsername, hashed]
    );

    return renderLoginPage(res, {
      success: true,
      message: 'Account created. Please log in.',
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.render('pages/register', {
      error: true,
      message: 'Something went wrong.',
      pageClass: 'register-page',
      backgroundLayers: defaultBackgroundLayers(false),
    });
  }
});

// TRANSITION SCREEN
app.get('/transition', requireAuth, (req, res) => {
  res.render('pages/transition', {
    title: 'Preparing…',
    pageClass: 'transition-page',
    siteName: 'BETWISE',
    hideFooter: true,
    backgroundLayers: [
      'neon-clouds',
      'caustics',
      'bloom-overlay',
      'neon-dots',
    ],
  });
});

// ABOUT
app.get('/about', (req, res) => {
  res.render('pages/about', {
    title: 'About Betwise',
    pageClass: 'about-page ultra-ink',
    siteName: 'BETWISE',
    backgroundLayers: defaultBackgroundLayers(true),
  });
});

// *****************************************************
// HOME PAGE
// *****************************************************

app.get('/home', requireAuth, (req, res) => {
  const games = [
    {
      name: 'Slots',
      description: 'Spin the reels!',
      tag: 'Classic',
      route: '/slots',
      image: '/resources/images/slotsFishImage.png',
    },
    {
      name: 'Blackjack',
      description: 'Beat the dealer.',
      tag: 'Card Game',
      route: '/blackjack',
      image: '/resources/images/blackjackFishImage.png',
    },
    {
      name: 'Mines',
      description: 'Avoid the bombs!',
      tag: 'Strategy',
      route: '/mines',
      image: '/resources/images/minesFishImage.png',
    },
  ];

  res.render('pages/home', {
    title: 'Play',
    pageClass: 'home-page ultra-ink',
    siteName: 'BETWISE',
    games,
    backgroundLayers: defaultBackgroundLayers(true),
  });
});

// *****************************************************
// TRANSACTION HELPER
// *****************************************************

async function recordTransaction(userId, deltaAmount, type, description = '') {
  return db.tx(async t => {
    const updated = await t.one(
      `UPDATE users
       SET balance = balance + $1
       WHERE user_id = $2
       RETURNING user_id, username, balance`,
      [deltaAmount, userId]
    );

    await t.none(
      `INSERT INTO transactions (user_id, type, amount, description)
       VALUES ($1,$2,$3,$4)`,
      [userId, type, deltaAmount, description]
    );

    return updated;
  });
}

/*****************************************************
// GAME ROUTES — Blackjack / Slots / Mines
*****************************************************/

// ---------- BLACKJACK ----------
app.get('/blackjack', requireAuth, (req, res) => {
  res.render('pages/blackjack', {
    title: 'Betwise — Blackjack',
    pageClass: 'blackjack-page ultra-ink',
    siteName: 'BETWISE',
    backgroundLayers: defaultBackgroundLayers(true),
  });
});

app.post('/blackjack/start', requireAuth, async (req, res) => {
  const bet = Number(req.body.bet);

  if (!bet || bet <= 0)
    return res.status(400).json({ error: 'Invalid bet amount.' });

  try {
    const user = await db.one(
      `SELECT balance FROM users WHERE user_id=$1`,
      [req.session.user.user_id]
    );

    if (bet > user.balance)
      return res.status(400).json({ error: 'Insufficient balance.' });

    const updated = await recordTransaction(
      req.session.user.user_id,
      -bet,
      'Blackjack Bet',
      `Started Blackjack bet of ${bet}`
    );

    req.session.user.balance = updated.balance;

    res.json({ ok: true, newBalance: updated.balance });
  } catch (err) {
    console.error('BJ start error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

app.post('/blackjack/settle', requireAuth, async (req, res) => {
  const { netPayout, result } = req.body;
  const payout = Number(netPayout);

  if (!Number.isFinite(payout) || payout < 0)
    return res.status(400).json({ error: 'Invalid payout' });

  let type = 'Blackjack Result';
  let desc = `Blackjack result ${result} for +${payout}`;

  if (result === 'loss' && payout === 0) {
    type = 'Blackjack Loss';
    desc = 'Lost Blackjack round';
  } else if (result === 'win') {
    type = 'Blackjack Win';
    desc = `Won Blackjack +${payout}`;

    await db.none(
      `UPDATE users SET wins = wins + 1 WHERE user_id=$1`,
      [req.session.user.user_id]
    );

  } else if (result === 'push') {
    type = 'Blackjack Push';
    desc = `Push, returned ${payout}`;
  }

  try {
    if (payout > 0) {
      const updated = await recordTransaction(
        req.session.user.user_id,
        payout,
        type,
        desc
      );

      req.session.user.balance = updated.balance;
      return res.json({ ok: true, newBalance: updated.balance });
    }

    const u = await db.one(
      `SELECT balance FROM users WHERE user_id=$1`,
      [req.session.user.user_id]
    );

    req.session.user.balance = u.balance;

    res.json({ ok: true, newBalance: u.balance });
  } catch (err) {
    console.error('BJ settle error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

app.post('/blackjack/double', requireAuth, async (req, res) => {
  const extraBet = Number(req.body.extraBet);
  if (!extraBet || extraBet <= 0)
    return res.status(400).json({ error: 'Invalid extra bet.' });

  try {
    const fresh = await db.one(
      `SELECT balance FROM users WHERE user_id=$1`,
      [req.session.user.user_id]
    );

    if (extraBet > fresh.balance)
      return res.status(400).json({ error: 'Insufficient balance.' });

    const updated = await recordTransaction(
      req.session.user.user_id,
      -extraBet,
      'Blackjack Double',
      `Double down extra ${extraBet}`
    );

    req.session.user.balance = updated.balance;
    res.json({ ok: true, newBalance: updated.balance });
  } catch (err) {
    console.error('BJ double error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ---------- SLOTS ----------
app.get('/slots', requireAuth, (req, res) => {
  res.render('pages/slots', {
    title: 'Betwise — Slots',
    pageClass: 'slots-page ultra-ink',
    siteName: 'BETWISE',
    backgroundLayers: defaultBackgroundLayers(true),
  });
});

app.post('/slots/spin', requireAuth, async (req, res) => {
  const bet = Number(req.body.bet);

  if (!bet || bet <= 0)
    return res.status(400).json({ error: 'Invalid bet amount.' });

  const userId = req.session.user.user_id;

  try {
    const user = await db.one(
      `SELECT balance FROM users WHERE user_id = $1`,
      [userId]
    );

    if (bet > user.balance)
      return res.status(400).json({ error: 'Insufficient balance.' });

    const afterBet = await recordTransaction(
      userId,
      -bet,
      'Slots Spin',
      `Slots bet ${bet}`
    );

    const SYMBOLS = ['🍒', '🔔', '🍋', '⭐', '7️⃣', '💎'];

    const reels = [
      SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
      SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
      SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
    ];

    let payoutTotal = 0;
    const [a, b, c] = reels;

    if (a === b && b === c) {
      payoutTotal = a === '💎' ? bet * 10 : a === '🍒' ? bet * 3 : bet * 2;
    } else if (a === b || b === c || a === c) {
      payoutTotal = bet * 2;
    }

    let updatedBalance = afterBet.balance;

    if (payoutTotal > 0) {
      const winUpdate = await recordTransaction(
        userId,
        payoutTotal,
        'Slots Win',
        `Slots payout ${payoutTotal}`
      );
      updatedBalance = winUpdate.balance;

      await db.none(
        `UPDATE users SET wins = wins + 1 WHERE user_id=$1`,
        [userId]
      );
    }

    const net = payoutTotal - bet;

    req.session.user.balance = updatedBalance;

    res.json({
      ok: true,
      reels,
      payout: net,
      totalPayout: payoutTotal,
      newBalance: updatedBalance,
    });
  } catch (err) {
    console.error('Slots spin error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ---------- MINES ----------
app.get('/mines', requireAuth, (req, res) => {
  res.render('pages/mines', {
    title: 'Betwise — Mines',
    pageClass: 'mines-page ultra-ink',
    siteName: 'BETWISE',
    backgroundLayers: defaultBackgroundLayers(true),
  });
});

app.post('/mines/start', requireAuth, async (req, res) => {
  const bet = Number(req.body.bet);

  if (!bet || bet <= 0)
    return res.status(400).json({ error: 'Invalid bet.' });

  try {
    const user = await db.one(
      `SELECT balance FROM users WHERE user_id=$1`,
      [req.session.user.user_id]
    );

    if (bet > user.balance)
      return res.status(400).json({ error: 'Insufficient balance.' });

    const updated = await recordTransaction(
      req.session.user.user_id,
      -bet,
      'Mines Bet',
      `Started Mines with ${bet}`
    );

    req.session.user.balance = updated.balance;
    res.json({ ok: true, newBalance: updated.balance });
  } catch (err) {
    console.error('Mines start error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

app.post('/mines/cashout', requireAuth, async (req, res) => {
  const { payout, resultType } = req.body;
  const amount = Number(payout);

  if (Number.isNaN(amount) || amount < 0)
    return res.status(400).json({ error: 'Invalid payout.' });

  let type = 'Mines Cashout';
  let desc = `Cashout +${amount}`;
  let incrementWin = false;

  if (resultType === 'loss' || amount === 0) {
    type = 'Mines Loss';
    desc = 'Lost Mines round';
  } else if (resultType === 'win') {
    type = 'Mines Win';
    desc = `Full clear +${amount}`;
    incrementWin = true;
  }

  try {
    const userId = req.session.user.user_id;

    const updated = await db.tx(async t => {
      if (amount > 0) {
        await t.none(
          `INSERT INTO transactions (user_id, type, amount, description)
           VALUES ($1, $2, $3, $4)`,
          [userId, type, amount, desc]
        );

        await t.none(
          `UPDATE users SET balance = balance + $1 WHERE user_id = $2`,
          [amount, userId]
        );
      } else {
        await t.none(
          `INSERT INTO transactions (user_id, type, amount, description)
           VALUES ($1, $2, 0, $3)`,
          [userId, type, desc]
        );
      }

      if (incrementWin) {
        await t.none(
          `UPDATE users SET wins = wins + 1 WHERE user_id=$1`,
          [userId]
        );
      }

      return t.one(`SELECT balance FROM users WHERE user_id=$1`, [userId]);
    });

    req.session.user.balance = updated.balance;

    return res.json({ ok: true, newBalance: updated.balance });
  } catch (err) {
    console.error('Mines cashout error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

app.post('/mines/tile-win', requireAuth, async (req, res) => {
  const { tileReward } = req.body;
  const amount = Number(tileReward);
  if (!Number.isFinite(amount) || amount < 0) {
    return res.json({ newBalance: req.session.user.balance });
  }

  const updated = await recordTransaction(
    req.session.user.user_id,
    amount,
    'Mines Tile Reward',
    `Safe tile reward ${amount}`
  );

  req.session.user.balance = updated.balance;
  res.json({ newBalance: updated.balance });
});

// *****************************************************
// LEADERBOARD — NOW SORTED BY WINS
// *****************************************************

app.get('/leaderboard', requireAuth, async (req, res) => {
  const backgroundLayers = [
    'neon-clouds dim',
    'caustics softer',
    'bloom-overlay subtle',
    'neon-dots',
  ];

  try {
    const usersByWins = await db.any(`
      SELECT user_id, username, balance, wins
      FROM users
      ORDER BY wins DESC, balance DESC;
    `);

    const maxWins = usersByWins.length > 0 ? usersByWins[0].wins : 1;

    const leaderboard = usersByWins.map((u, i) => ({
      rank: i + 1,
      username: u.username,
      balance: u.balance,
      wins: u.wins,
      status: getStatusTier(u.balance),
      progress: Math.round((u.wins / maxWins) * 100)
    }));

    res.render('pages/leaderboard', {
      leaderboard,
      title: 'Betwise — Leaderboard',
      pageClass: 'leaderboard-page ultra-ink',
      backgroundLayers,
      siteName: 'BETWISE',
    });

  } catch (err) {
    console.error(err);

    res.render('pages/leaderboard', {
      leaderboard: [],
      error: 'Failed to load leaderboard',
      title: 'Betwise — Leaderboard',
      pageClass: 'leaderboard-page ultra-ink',
      backgroundLayers,
      siteName: 'BETWISE',
    });
  }
});

// Optional helper — tier names for badge colors
function getStatusTier(balance) {
  if (balance >= 10000) return 'legend';
  if (balance >= 5000) return 'diamond';
  if (balance >= 2500) return 'platinum';
  if (balance >= 1500) return 'gold';
  if (balance >= 750) return 'silver';
  return 'bronze';
}

// *****************************************************
// WALLET
// *****************************************************

app.get('/wallet', requireAuth, async (req, res) => {
  try {
    const transactions = await getUserTransactions(req.session.user.user_id);

    res.render('pages/wallet', {
      title: 'Betwise — Wallet',
      pageClass: 'wallet-page ultra-ink',
      siteName: 'BETWISE',
      user: req.session.user,
      balance: req.session.user.balance,
      transactions,
      backgroundLayers: [
        'neon-clouds dim',
        'caustics softer',
        'bloom-overlay subtle',
        'neon-dots',
      ],
    });
  } catch (err) {
    console.error('Wallet error:', err);
    res.status(500).send('Server error');
  }
});

app.post('/wallet/add-credits', requireAuth, async (req, res) => {
  const amount = Number(req.body.amount);

  const backgroundLayers = [
    'neon-clouds dim',
    'caustics softer',
    'bloom-overlay subtle',
    'neon-dots',
  ];

  if (!Number.isInteger(amount) || amount < 1 || amount > 1000) {
    const transactions = await getUserTransactions(req.session.user.user_id);

    return res.status(400).render('pages/wallet', {
      title: 'Betwise — Wallet',
      pageClass: 'wallet-page ultra-ink',
      siteName: 'BETWISE',
      user: req.session.user,
      balance: req.session.user.balance,
      transactions,
      errorMessage: 'Invalid input.',
      backgroundLayers,
    });
  }

  try {
    const row = await db.one(
      `SELECT balance, daily_added_credits, last_credit_topup_date
       FROM users WHERE user_id=$1`,
      [req.session.user.user_id]
    );

    const today = new Date().toISOString().slice(0, 10);
    const last = row.last_credit_topup_date
      ? row.last_credit_topup_date.toISOString().slice(0, 10)
      : null;

    let todayCount = row.daily_added_credits;
    if (last !== today) todayCount = 0;

    if (todayCount + amount > DAILY_CREDIT_LIMIT) {
      const remaining = Math.max(DAILY_CREDIT_LIMIT - todayCount, 0);
      const transactions = await getUserTransactions(
        req.session.user.user_id
      );

      return res.status(400).render('pages/wallet', {
        title: 'Betwise — Wallet',
        pageClass: 'wallet-page ultra-ink',
        siteName: 'BETWISE',
        user: req.session.user,
        balance: row.balance,
        transactions,
        errorMessage:
          remaining > 0
            ? `Daily limit reached. You can add ${remaining} more today.`
            : `Daily limit reached. You cannot add more credits today.`,
        backgroundLayers,
      });
    }

    await db.tx(async t => {
      const newBalance = Number(row.balance) + amount;

      await t.none(
        `UPDATE users
         SET balance=$1,
             daily_added_credits=$2,
             last_credit_topup_date=$3
         WHERE user_id=$4`,
        [newBalance, todayCount + amount, today, req.session.user.user_id]
      );

      await t.none(
        `INSERT INTO transactions (user_id, type, amount, description)
         VALUES ($1,'wallet_add',$2,'Added credits from wallet page')`,
        [req.session.user.user_id, amount]
      );

      req.session.user.balance = newBalance;
    });

    res.redirect('/wallet');
  } catch (err) {
    console.error('Add credits error:', err);
    res.status(500).send('Server error');
  }
});

// *****************************************************
// PROFILE
// *****************************************************

app.get('/profile', requireAuth, async (req, res) => {
  try {
    const prof = await db.one(
      `SELECT * FROM users WHERE username=$1`,
      [req.session.user.username]
    );

    res.render('pages/profile', {
      title: 'Profile',
      pageClass: 'profile-page ultra-ink',
      siteName: 'BETWISE',
      backgroundLayers: defaultBackgroundLayers(true),
      prof,
    });
  } catch (err) {
    console.error('Profile error:', err);
    res.status(500).send('Server error');
  }
});

// *****************************************************
// LOGOUT
// *****************************************************

function handleLogout(req, res) {
  req.session.destroy(() => res.redirect('/'));
}

app.get('/logout', handleLogout);
app.post('/logout', handleLogout);

// *****************************************************
// TEST ROUTE
// *****************************************************

app.get('/welcome', (req, res) =>
  res.json({ status: 'success', message: 'Welcome!' })
);

// *****************************************************
// START SERVER
// *****************************************************

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () =>
  console.log(`Betwise server running at http://localhost:${PORT}`)
);

module.exports = server;