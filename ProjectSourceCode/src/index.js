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

const DAILY_CREDIT_LIMIT = 5000; // total credits user can add per day

// *****************************************************
// Section 2 : Connect to DB (pg-promise ONLY)
// *****************************************************

const hbs = handlebars.create({
  extname: 'hbs',
  layoutsDir: __dirname + '/views/layouts',
  partialsDir: __dirname + '/views/partials',
  defaultLayout: 'main',
});

const dbConfig = {
  host: 'db',
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
  .catch(error => {
    console.log('ERROR:', error.message || error);
  });

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

// Authentication middleware
function requireAuth(req, res, next) {
  if (!req.session.user) return res.redirect('/');
  next();
}

// Human readable type for wallet display
function friendlyType(code) {
  switch (code) {
    // Wallet
    case 'wallet_add':       return 'Add Credits';

    // Slots
    case 'Slots Spin':       return 'Slots Spin';
    case 'Slots Win':        return 'Slots Win';
    case 'slots':            return 'Slots Spin';    // legacy code type

    // Blackjack
    case 'Blackjack Bet':    return 'Blackjack Bet';
    case 'Blackjack Win':    return 'Blackjack Win';
    case 'Blackjack Loss':   return 'Blackjack Loss';
    case 'Blackjack Push':   return 'Blackjack Push (Tie)';
    case 'Blackjack Double': return 'Blackjack Double Down';
    case 'Blackjack Result': return 'Blackjack Result';

    // Mines
    case 'Mines Bet':        return 'Mines Bet';
    case 'Mines Win':        return 'Mines Win';
    case 'Mines Loss':       return 'Mines Loss';
    case 'Mines Cashout':    return 'Mines Cashout';

    default:
      return code; // fallback: show raw type string
  }
}

// Load and format recent transactions for a user
async function getUserTransactions(userId) {
  const rows = await db.any(
    `SELECT type, amount, created_at
     FROM transactions
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 20`,
    [userId]
  );

  return rows.map(row => {
    const amt = Number(row.amount);
    return {
      type: friendlyType(row.type),
      amount: Math.abs(amt),
      amountPositive: amt > 0,
      date: row.created_at.toISOString().slice(0, 10), // YYYY-MM-DD
    };
  });
}

// Make balance & user globally available to templates
app.use((req, res, next) => {
  if (req.session.user) {
    const n = Number(req.session.user.balance);
    const safeBalance = Number.isFinite(n) ? n : 0;

    req.session.user.balance = safeBalance;   // keep session consistent
    res.locals.user = req.session.user;
    res.locals.balance = safeBalance;         // used by nav.hbs {{balance}}
  } else {
    res.locals.user = null;
    res.locals.balance = null;
  }
  next();
});

// *****************************************************
// Helper: Background presets
// *****************************************************

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

// *****************************************************
// Auth Routes
// *****************************************************

function renderLoginPage(res, extra = {}) {
  const backgroundLayers = defaultBackgroundLayers(false);
  res.render('pages/login', {
    title: 'Login',
    pageClass: 'login-page',
    backgroundLayers,
    titleText: 'BETWISE',
    subtitleText: 'Flow With The Odds',
    hideFooter: true,
    ...extra
  });
}

// ROOT → Login
app.get('/', (req, res) => {
  if (req.session.user) return res.redirect('/home');
  return renderLoginPage(res);
});

app.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/home');
  return renderLoginPage(res);
});

// LOGIN HANDLER
app.post('/login', async (req, res) => {
  let { username, password } = req.body;

  username = typeof username === 'string' ? username.trim() : '';
  password = typeof password === 'string' ? password.trim() : '';

  if (!username || !password) {
    if (req.is('application/json')) {
      return res.status(400).json({ message: 'Invalid username or password.' });
    }
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

    if (!user) {
      if (req.is('application/json')) {
        return res.status(400).json({ message: 'Invalid username or password.' });
      }
      return renderLoginPage(res, {
        error: true,
        message: 'Invalid username or password.',
      });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      if (req.is('application/json')) {
        return res.status(400).json({ message: 'Invalid username or password.' });
      }
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

    // For JSON callers (tests), just send OK; for browser, redirect
    if (req.is('application/json')) {
      return res.status(200).json({ message: 'Success' });
    }

    return res.redirect('/transition');
  } catch (err) {
    console.error('Login error:', err);
    if (req.is('application/json')) {
      return res.status(500).json({ message: 'Server error' });
    }
    return renderLoginPage(res, {
      error: true,
      message: 'Something went wrong.',
    });
  }
});

// REGISTER PAGE
app.get('/register', (req, res) => {
  if (req.session.user) return res.redirect('/home');

  const backgroundLayers = defaultBackgroundLayers(false);

  res.render('pages/register', {
    title: 'Register',
    pageClass: 'register-page',
    hideFooter: true,
    backgroundLayers
  });
});

// REGISTER HANDLER (supports JSON tests + normal HTML)
app.post('/register', async (req, res) => {
  let { username, password } = req.body;

  // Type check first (for tests)
  if (typeof username !== 'string' || typeof password !== 'string') {
    if (req.is('application/json')) {
      return res.status(400).json({ message: 'Invalid input' });
    }
    return res.status(400).render('pages/register', {
      title: 'Register',
      pageClass: 'register-page',
      backgroundLayers: defaultBackgroundLayers(false),
      error: true,
      message: 'Invalid input.',
    });
  }

  const cleanUsername = username.trim();
  const cleanPassword = password.trim();

  if (!cleanUsername || !cleanPassword) {
    if (req.is('application/json')) {
      return res.status(400).json({ message: 'Invalid input' });
    }
    return res.status(400).render('pages/register', {
      title: 'Register',
      pageClass: 'register-page',
      backgroundLayers: defaultBackgroundLayers(false),
      error: true,
      message: 'All fields required.',
    });
  }

  try {
    const existing = await db.oneOrNone(
      'SELECT user_id FROM users WHERE username = $1',
      [cleanUsername]
    );

    if (existing) {
      if (req.is('application/json')) {
        return res.status(400).json({ message: 'Invalid input' });
      }
      return res.render('pages/register', {
        title: 'Register',
        pageClass: 'register-page',
        backgroundLayers: defaultBackgroundLayers(false),
        error: true,
        message: 'Username already taken.',
      });
    }

    const hashed = await bcrypt.hash(cleanPassword, 10);

    const user = await db.one(
      `INSERT INTO users (username, password_hash)
       VALUES ($1, $2)
       RETURNING user_id, username, balance`,
      [cleanUsername, hashed]
    );

    // JSON callers (tests)
    if (req.is('application/json')) {
      return res.status(200).json({ message: 'Success' });
    }

    //No auto-login, show login page with success message
    return renderLoginPage(res, {
      success: true,
      message: 'Account created. Please log in.',
    });

  } catch (err) {
    console.error('Registration error:', err);
    if (req.is('application/json')) {
      return res.status(500).json({ message: 'Server error' });
    }
    return res.render('pages/register', {
      title: 'Register',
      pageClass: 'register-page',
      backgroundLayers: defaultBackgroundLayers(false),
      error: true,
      message: 'Something went wrong.',
    });
  }
});

// TRANSITION PAGE
app.get('/transition', requireAuth, (req, res) => {
  const backgroundLayers = [
    'neon-clouds',
    'caustics',
    'bloom-overlay',
    'neon-dots',
  ];

  res.render('pages/transition', {
    title: 'Preparing…',
    pageClass: 'transition-page',
    siteName: 'BETWISE',
    backgroundLayers,
    hideFooter: true, 
    user: req.session.user
  });
});

app.get('/about', (req, res) => {
  const backgroundLayers = defaultBackgroundLayers(true);

  res.render('pages/about', {
    title: 'About Betwise',
    pageClass: 'about-page ultra-ink',
    backgroundLayers,
    siteName: "BETWISE",
    hideFooter: false
  });
});

// *****************************************************
// Section 5 : Main Pages
// *****************************************************

// HOME PAGE
app.get('/home', requireAuth, (req, res) => {
  const games = [
    { name: 'Slots', description: 'Spin the reels and test your luck!', tag: 'Classic', route: '/slots', image: '/resources/images/slotsFishImage.png' },
    { name: 'Blackjack', description: 'Beat the dealer and hit 21.', tag: 'Card Game', route: '/blackjack', image: '/resources/images/blackjackFishImage.png' },
    { name: 'Mines', description: 'Choose wisely and avoid the bombs!', tag: 'Strategy', route: '/mines', image: '/resources/images/minesFishImage.png' },
  ];

  const backgroundLayers = defaultBackgroundLayers(true);

  res.render('pages/home', {
    title: 'Play',
    pageClass: 'home-page ultra-ink',
    user: req.session.user,
    siteName: 'BETWISE',
    games,
    backgroundLayers,
  });
});

// Transaction helper: record a balance change and log it
async function recordTransaction(userId, deltaAmount, type, description = '') {
  return db.tx(async t => {
    const user = await t.one(
      `UPDATE users
       SET balance = balance + $1
       WHERE user_id = $2
       RETURNING user_id, username, balance`,
      [deltaAmount, userId]
    );

    await t.none(
      `INSERT INTO transactions (user_id, type, amount, description)
       VALUES ($1, $2, $3, $4)`,
      [userId, type, deltaAmount, description]
    );

    return user;
  });
}

// BLACKJACK
app.get('/blackjack', requireAuth, (req, res) => {
  res.render('pages/blackjack', {
    title: 'Betwise — Blackjack',
    pageClass: 'blackjack-page ultra-ink',
    backgroundLayers: defaultBackgroundLayers(true),
    siteName: 'BETWISE',
    user: req.session.user,
  });
});

// BLACKJACK: start round – subtract bet and log "Blackjack Bet"
app.post('/blackjack/start', requireAuth, async (req, res) => {
  const user = req.session.user;
  const bet = Number(req.body.bet);

  if (!bet || bet <= 0) {
    return res.status(400).json({ error: 'Invalid bet amount.' });
  }

  try {
    const freshUser = await db.one(
      'SELECT user_id, balance FROM users WHERE user_id = $1',
      [user.user_id]
    );

    if (bet > freshUser.balance) {
      return res.status(400).json({ error: 'Insufficient balance.' });
    }

    const updatedUser = await recordTransaction(
      freshUser.user_id,
      -bet,
      'Blackjack Bet',
      `Started a Blackjack round with bet ${bet}`
    );

    req.session.user.balance = updatedUser.balance;

    return res.json({
      ok: true,
      newBalance: updatedUser.balance,
    });
  } catch (err) {
    console.error('Blackjack start error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// BLACKJACK: settle result – add payouts and log Win/Loss/Push
app.post('/blackjack/settle', requireAuth, async (req, res) => {
  const user = req.session.user;
  const { netPayout, result } = req.body;
  const numeric = Number(netPayout);

  if (!Number.isFinite(numeric) || numeric < 0) {
    return res.status(400).json({ error: 'Invalid net payout.' });
  }

  let type;
  let desc;

  if (numeric === 0 && result === 'loss') {
    type = 'Blackjack Loss';
    desc = 'Blackjack round lost (no payout)';
  } else if (result === 'push') {
    type = 'Blackjack Push';
    desc = `Blackjack push, returned ${numeric} credits`;
  } else if (result === 'win') {
    type = 'Blackjack Win';
    desc = `Blackjack win for +${numeric} credits`;
  } else {
    type = 'Blackjack Result';
    desc = `Blackjack result ${result} for +${numeric} credits`;
  }

  try {
    let updatedUser;

    if (numeric > 0) {
      updatedUser = await recordTransaction(
        user.user_id,
        numeric,
        type,
        desc
      );
    } else {
      updatedUser = await db.one(
        'SELECT user_id, balance FROM users WHERE user_id = $1',
        [user.user_id]
      );
    }

    req.session.user.balance = updatedUser.balance;

    return res.json({
      ok: true,
      newBalance: updatedUser.balance,
    });
  } catch (err) {
    console.error('Blackjack settle error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// BLACKJACK: double down – subtract an extra bet equal to current bet
app.post('/blackjack/double', requireAuth, async (req, res) => {
  const user = req.session.user;
  const extraBet = Number(req.body.extraBet);

  if (!extraBet || extraBet <= 0) {
    return res.status(400).json({ error: 'Invalid double amount.' });
  }

  try {
    const freshUser = await db.one(
      'SELECT user_id, balance FROM users WHERE user_id = $1',
      [user.user_id]
    );

    if (extraBet > freshUser.balance) {
      return res.status(400).json({ error: 'Insufficient balance to double.' });
    }

    const updatedUser = await recordTransaction(
      freshUser.user_id,
      -extraBet,
      'Blackjack Double',
      `Blackjack double down for extra bet ${extraBet}`
    );

    req.session.user.balance = updatedUser.balance;

    return res.json({
      ok: true,
      newBalance: updatedUser.balance,
    });
  } catch (err) {
    console.error('Blackjack double error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// SLOTS
app.get('/slots', requireAuth, (req, res) => {
  if (typeof req.session.user.balance !== 'number') {
    req.session.user.balance = 1000;
  }

  res.render('pages/slots', {
    title: 'Betwise — Slots',
    pageClass: 'slots-page ultra-ink',
    backgroundLayers: defaultBackgroundLayers(true),
    user: req.session.user,
    siteName: 'BETWISE',
    balance: req.session.user.balance,
  });
});

// SLOTS SPIN API
app.post('/slots/spin', requireAuth, async (req, res) => {
  const bet = Number(req.body.bet);

  if (!bet || bet <= 0) {
    return res.status(400).json({ error: 'Invalid bet amount.' });
  }

  if (typeof req.session.user.balance !== 'number') {
    req.session.user.balance = 1000;
  }

  if (bet > req.session.user.balance) {
    return res.status(400).json({ error: 'Insufficient balance.' });
  }

  const SYMBOLS = ['🍒', '🔔', '🍋', '⭐', '7️⃣', '💎'];

  const reels = [
    SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
    SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
    SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
  ];

  const [a, b, c] = reels;
  let payout = 0;

  if (a === b && b === c) {
    payout = a === '💎' ? bet * 10 : a === '🍒' ? bet * 3 : bet * 2;
  } else if (a === b || b === c || a === c) {
    payout = bet * 2;
  }

  const netDelta = -bet + payout;

  const updatedUser = await recordTransaction(
    req.session.user.user_id,
    netDelta,
    payout > 0 ? 'Slots Win' : 'Slots Spin',
    `Slots spin bet=${bet}, payout=${payout}`
  );

  req.session.user.balance = updatedUser.balance;

  res.json({
    reels,
    payout,
    newBalance: req.session.user.balance,
  });
});

// MINES
app.get('/mines', requireAuth, (req, res) => {
  res.render('pages/mines', {
    title: 'Betwise — Mines',
    pageClass: 'mines-page ultra-ink',
    backgroundLayers: defaultBackgroundLayers(true),
    siteName: 'BETWISE',
    user: req.session.user,
  });
});

// MINES: start (bet taken)
app.post('/mines/start', requireAuth, async (req, res) => {
  const user = req.session.user;
  let bet = Number(req.body.bet);

  if (!bet || bet <= 0) {
    return res.status(400).json({ error: 'Invalid bet amount.' });
  }

  try {
    const freshUser = await db.one(
      'SELECT user_id, balance FROM users WHERE user_id = $1',
      [user.user_id]
    );

    if (bet > freshUser.balance) {
      return res.status(400).json({ error: 'Insufficient balance.' });
    }

    const updatedUser = await recordTransaction(
      freshUser.user_id,
      -bet,
      'Mines Bet',
      `Started a Mines round with bet ${bet}`
    );

    req.session.user.balance = updatedUser.balance;

    return res.json({
      ok: true,
      newBalance: updatedUser.balance,
    });
  } catch (err) {
    console.error('Mines start error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// MINES: cashout/settle
app.post('/mines/cashout', requireAuth, async (req, res) => {
  const user = req.session.user;
  const { payout, resultType } = req.body;

  const numericPayout = Number(payout);

  if (Number.isNaN(numericPayout) || numericPayout < 0) {
    return res.status(400).json({ error: 'Invalid payout.' });
  }

  let type;
  let desc;

  if (numericPayout === 0 || resultType === 'loss') {
    type = 'Mines Loss';
    desc = 'Mines round ended with no payout';
  } else if (resultType === 'win') {
    type = 'Mines Win';
    desc = `Mines full clear win for +${numericPayout} credits`;
  } else {
    type = 'Mines Cashout';
    desc = `Mines cashout for +${numericPayout} credits`;
  }

  try {
    let updatedUser;

    if (numericPayout > 0) {
      updatedUser = await recordTransaction(
        user.user_id,
        numericPayout,
        type,
        desc
      );
    } else {
      updatedUser = await db.one(
        'SELECT user_id, balance FROM users WHERE user_id = $1',
        [user.user_id]
      );
    }

    req.session.user.balance = updatedUser.balance;

    return res.json({
      ok: true,
      newBalance: updatedUser.balance,
    });
  } catch (err) {
    console.error('Mines cashout error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// LEADERBOARD (placeholder)
app.get('/leaderboard', requireAuth, async (req, res) => {

  const rawLeaderboard = [
    { rank: 1, username: 'fish', balance: 12500 },
    { rank: 2, username: 'this fish', balance: 11340 },
    { rank: 3, username: 'that fish', balance: 9980 },
    { rank: 4, username: 'other fish', balance: 8740 },
    { rank: 5, username: 'yay fish!', balance: 8210 },
  ];

  function balanceTier(balance) {
    if (balance >= 10000) return "legend";
    if (balance >= 7000) return "diamond";
    if (balance >= 5000) return "platinum";
    if (balance >= 3000) return "gold";
    if (balance >= 1500) return "silver";
    return "bronze";
  }

  const leaderboard = rawLeaderboard.map(p => ({
    ...p,
    tierClass: balanceTier(p.balance)
  }));

  res.render('pages/leaderboard', {
    title: 'Betwise — Leaderboard',
    pageClass: 'leaderboard-page ultra-ink',
    backgroundLayers: defaultBackgroundLayers(true),
    siteName: 'BETWISE',
    user: req.session.user,
    leaderboard,
  });

});


// WALLET (placeholder)
app.get('/wallet', requireAuth, async (req, res) => {
  const backgroundLayers = [
    'neon-clouds dim',
    'caustics softer',
    'bloom-overlay subtle',
    'neon-dots',
  ];

  try {
    const row = await db.one(
      'SELECT balance FROM users WHERE user_id = $1',
      [req.session.user.user_id]
    );
    req.session.user.balance = Number(row.balance);

    const transactions = await getUserTransactions(req.session.user.user_id);

    res.render('pages/wallet', {
      title: 'Betwise — Wallet',
      pageClass: 'wallet-page ultra-ink',
      backgroundLayers,
      siteName: 'BETWISE',
      user: req.session.user,
      balance: req.session.user.balance,
      transactions,
    });
  } catch (err) {
    console.error('Error loading wallet:', err);
    res.status(500).send('Server error');
  }
});

// ADD CREDITS HANDLER WITH DAILY LIMIT (Wallet Page)
app.post('/wallet/add-credits', requireAuth, async (req, res) => {
  const backgroundLayers = [
    'neon-clouds dim',
    'caustics softer',
    'bloom-overlay subtle',
    'neon-dots',
  ];

  const rawAmount = req.body.amount;
  const amount = Number(rawAmount);

  const isInt = Number.isInteger(amount);
  if (!isInt || amount < 1 || amount > 1000) {
    console.log('Invalid wallet input:', rawAmount);

    const balance = req.session.user.balance ?? 0;
    const transactions = await getUserTransactions(req.session.user.user_id);

    return res.status(400).render('pages/wallet', {
      title: 'Betwise — Wallet',
      pageClass: 'wallet-page ultra-ink',
      backgroundLayers,
      siteName: 'BETWISE',
      user: req.session.user,
      balance,
      transactions,
      errorMessage: 'Invalid input',
    });
  }

  try {
    const row = await db.one(
      `SELECT balance, daily_added_credits, last_credit_topup_date
       FROM users
       WHERE user_id = $1`,
      [req.session.user.user_id]
    );

    const todayStr = new Date().toISOString().slice(0, 10);
    const lastDate = row.last_credit_topup_date
      ? row.last_credit_topup_date.toISOString().slice(0, 10)
      : null;

    let dailyAdded = row.daily_added_credits;

    if (lastDate !== todayStr) {
      dailyAdded = 0;
    }

    const newDailyTotal = dailyAdded + amount;

    if (newDailyTotal > DAILY_CREDIT_LIMIT) {
      const remaining = Math.max(DAILY_CREDIT_LIMIT - dailyAdded, 0);

      const transactions = await getUserTransactions(req.session.user.user_id);

      const message = remaining > 0
        ? `Daily limit reached. You can only add ${remaining} more credits today.`
        : `Daily limit reached. You cannot add more credits today.`;

      return res.status(400).render('pages/wallet', {
        title: 'Betwise — Wallet',
        pageClass: 'wallet-page ultra-ink',
        backgroundLayers,
        siteName: 'BETWISE',
        user: req.session.user,
        balance: row.balance,
        transactions,
        errorMessage: message,
      });
    }

    await db.tx(async t => {
      const newBalance = Number(row.balance) + amount;

      await t.none(
        `UPDATE users
         SET balance = $1,
             daily_added_credits = $2,
             last_credit_topup_date = $3
         WHERE user_id = $4`,
        [newBalance, newDailyTotal, todayStr, req.session.user.user_id]
      );

      await t.none(
        `INSERT INTO transactions (user_id, type, amount, description)
         VALUES ($1, 'wallet_add', $2, $3)`,
        [req.session.user.user_id, amount, 'Added credits from wallet page']
      );

      req.session.user.balance = newBalance;
    });

    res.redirect('/wallet');
  } catch (err) {
    console.error('Error adding credits with daily limit:', err);
    res.status(500).send('Server error');
  }
});

// PROFILE (view-only)
app.get('/profile', requireAuth, (req, res) => {
  const user = req.session.user;

  const profileUser = {
    username: user.username,
    balance: typeof user.balance === 'number' ? user.balance : 0,
  };

  res.render('pages/profile', {
    title: 'Profile',
    pageClass: 'profile-page ultra-ink',
    siteName: 'BETWISE',
    backgroundLayers: defaultBackgroundLayers(true),
    user: profileUser,
  });
});

// LOGOUT
function handleLogout(req, res) {
  req.session.destroy(() => res.redirect('/'));
}

app.get('/logout', handleLogout);
app.post('/logout', handleLogout);

// ================= TEST ROUTE (for server.spec.js) ==================
app.get('/welcome', (req, res) => {
  res.json({ status: 'success', message: 'Welcome!' });
});

// ================= START SERVER & EXPORT FOR TESTS ==================
const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`Betwise server running at http://localhost:${PORT}`);
});

module.exports = server;
