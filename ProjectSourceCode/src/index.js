// *****************************************************
// <!-- Section 1 : Import Dependencies -->
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

// *****************************************************
// <!-- Section 2 : Connect to DB -->
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
// <!-- Section 3 : App Settings -->
// *****************************************************

app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

app.use('/resources', express.static(path.join(__dirname, 'resources')));
app.use('/resources', express.static(path.join(__dirname, '..', 'resources')));

app.use(bodyParser.urlencoded({ extended: true }));
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

// *****************************************************
// <!-- Section 4 : Routes -->
// *****************************************************

// Make balance available to all templates automatically
app.use((req, res, next) => {
  if (req.session.user) {
    res.locals.balance = req.session.user.balance ?? 0;
  } else {
    res.locals.balance = null;
  }
  next();
});

// LOGIN PAGE
app.get('/', (req, res) => {
  if (req.session.user) return res.redirect('/home');

  const backgroundLayers = [
    "neon-clouds",
    "caustics",
    "particles",
    "glow-ripple",
    "bloom-overlay",
    "neon-dots"
  ];

  res.render('pages/login', {
    title: 'Login',
    pageClass: 'login-page',
    backgroundLayers,
    titleText: 'BETWISE',
    subtitleText: 'Flow With The Odds'
  });
});

// LOGIN HANDLER – CHECKS DATABASE
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await db.oneOrNone(
      "SELECT user_id, username, password_hash FROM users WHERE username = $1",
      [username]
    );

    if (!user) {
      return res.render('pages/login', {
        error: true,
        message: "Invalid username or password."
      });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.render('pages/login', {
        error: true,
        message: "Invalid username or password."
      });
    }

    req.session.user = {
      user_id: user.user_id,
      username: user.username
    };

    return res.redirect('/transition');

  } catch (err) {
    console.error("Login error:", err);
    res.render('pages/login', {
      error: true,
      message: "Something went wrong."
    });
  }
});

// REGISTER PAGE
app.get('/register', (req, res) => {
  if (req.session.user) return res.redirect('/home');

  const backgroundLayers = [
    "neon-clouds",
    "caustics",
    "particles",
    "glow-ripple",
    "bloom-overlay",
    "neon-dots"
  ];

  res.render('pages/register', {
    title: 'Register',
    pageClass: 'register-page',
    backgroundLayers
  });
});

// REGISTER HANDLER – INSERT USER INTO DATABASE
app.post('/register', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.render('pages/register', {
      error: true,
      message: "All fields required."
    });
  }

  try {
    const existing = await db.oneOrNone(
      "SELECT user_id FROM users WHERE username = $1",
      [username]
    );

    if (existing) {
      return res.render('pages/register', {
        error: true,
        message: "Username already taken."
      });
    }

    const hashed = await bcrypt.hash(password, 10);

    const user = await db.one(
      `INSERT INTO users (username, password_hash)
       VALUES ($1, $2)
       RETURNING user_id, username`,
      [username, hashed]
    );

    req.session.user = {
      user_id: user.user_id,
      username: user.username
    };

    res.redirect('/transition');

  } catch (err) {
    console.error("Registration error:", err);
    res.render('pages/register', {
      error: true,
      message: "Something went wrong."
    });
  }
});

// TRANSITION PAGE
app.get('/transition', requireAuth, (req, res) => {
  const backgroundLayers = [
    "neon-clouds",
    "caustics",
    "bloom-overlay",
    "neon-dots"
  ];

  res.render('pages/transition', {
    title: 'Preparing…',
    pageClass: 'transition-page',
    siteName: 'BETWISE',
    backgroundLayers,
    user: req.session.user
  });
});

// HOME PAGE
app.get('/home', requireAuth, (req, res) => {
  const games = [
    { name: "Slots", description: "Spin the reels and test your luck!", tag: "Classic", route: "/slots" },
    { name: "Blackjack", description: "Beat the dealer and hit 21.", tag: "Card Game", route: "/blackjack" },
    { name: "Mines", description: "Choose wisely and avoid the bombs!", tag: "Strategy", route: "/mines" }
  ];

  res.render('pages/home', {
    title: 'Play',
    pageClass: 'home-page ultra-ink',
    user: req.session.user,
    siteName: 'BETWISE',
    games
  });
});

// GAME ROUTES
app.get('/blackjack', requireAuth, (req, res) => {
  const backgroundLayers = [
    "neon-clouds dim",
    "caustics softer",
    "bloom-overlay subtle",
    "neon-dots"
  ];

  res.render('pages/blackjack', {
    title: 'Betwise — Blackjack',
    pageClass: 'blackjack-page ultra-ink',
    backgroundLayers,
    siteName: 'BETWISE',
    user: req.session.user
  });
});

app.get('/slots', requireAuth, (req, res) => {
  const backgroundLayers = [
    "neon-clouds dim",
    "caustics softer",
    "bloom-overlay subtle",
    "neon-dots"
  ];

  if (req.session.user.balance == null) req.session.user.balance = 0;

  res.render('pages/slots', {
    title: 'Betwise — Slots',
    pageClass: 'slots-page ultra-ink',
    backgroundLayers,
    user: req.session.user,
    siteName: 'BETWISE',
    balance: req.session.user.balance
  });
});

app.post('/slots/spin', requireAuth, (req, res) => {
  const bet = Number(req.body.bet);

  if (!bet || bet <= 0) {
    return res.status(400).json({ error: "Invalid bet amount." });
  }

  if (req.session.user.balance == null) req.session.user.balance = 1000;
  if (bet > req.session.user.balance) {
    return res.status(400).json({ error: "Insufficient balance." });
  }

  const SYMBOLS = ['🍒', '🔔', '🍋', '⭐', '7️⃣', '💎'];

  const reels = [
    SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
    SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
    SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]
  ];

  const [a, b, c] = reels;
  let payout = 0;

  if (a === b && b === c) {
    payout = a === '💎' ? bet * 10 : a === '🍒' ? bet * 3 : bet * 2;
  } else if (a === b || b === c || a === c) {
    payout = bet * 2;
  }

  req.session.user.balance = req.session.user.balance - bet + payout;

  res.json({
    reels,
    payout,
    newBalance: req.session.user.balance
  });
});

// MINES
app.get('/mines', requireAuth, (req, res) => {
  const backgroundLayers = [
    "neon-clouds dim",
    "caustics softer",
    "bloom-overlay subtle",
    "neon-dots"
  ];

  res.render('pages/mines', {
    title: 'Betwise — Mines',
    pageClass: 'mines-page ultra-ink',
    backgroundLayers,
    siteName: 'BETWISE',
    user: req.session.user
  });
});

// LEADERBOARD
app.get('/leaderboard', requireAuth, async (req, res) => {
  const backgroundLayers = [
    "neon-clouds dim",
    "caustics softer",
    "bloom-overlay subtle",
    "neon-dots"
  ];

  // Temporary mock data (replace with DB when ready)
  const rawLeaderboard = [
    { rank: 1, username: "fish", score: 12500, status: "Legend" },
    { rank: 2, username: "this fish", score: 11340, status: "Diamond" },
    { rank: 3, username: "that fish", score: 9980, status: "Platinum" },
    { rank: 4, username: "other fish", score: 8740, status: "Gold" },
    { rank: 5, username: "yay fish!", score: 8210, status: "Gold" }
  ];

  // Highest score defines 100%
  const maxScore = Math.max(...rawLeaderboard.map(p => p.score));

  // Calculate progress %
  const leaderboard = rawLeaderboard.map(p => ({
    ...p,
    progress: Math.round((p.score / maxScore) * 100)
  }));

  res.render('pages/leaderboard', {
    title: 'Betwise — Leaderboard',
    pageClass: 'leaderboard-page ultra-ink',
    backgroundLayers,
    siteName: 'BETWISE',
    user: req.session.user,
    leaderboard
  });
});

// WALLET
app.get('/wallet', requireAuth, async (req, res) => {
  const backgroundLayers = [
    "neon-clouds dim",
    "caustics softer",
    "bloom-overlay subtle",
    "neon-dots"
  ];

  // Sample data
  let transactions = [
    { type: "Deposit", amount: 250, date: "2025-01-12" },
    { type: "Withdrawal", amount: -100, date: "2025-01-10" },
    { type: "Game Win", amount: 450, date: "2025-01-05" },
    { type: "Slot Spin", amount: -50, date: "2025-01-03" }
  ];

  // Add safe comparison value
  transactions = transactions.map(t => ({
    ...t,
    amountPositive: t.amount > 0
  }));

  res.render('pages/wallet', {
    title: 'Betwise — Wallet',
    pageClass: 'wallet-page ultra-ink',
    backgroundLayers,
    siteName: 'BETWISE',
    user: req.session.user,
    balance: req.session.user.balance,
    transactions
  });
});

// LOGOUT
app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

// ================= START SERVER & EXPORT FOR TESTS ==================
const PORT = process.env.PORT || 3000;

// Start server and log a clickable link
const server = app.listen(PORT, () => {
  console.log(`Betwise server running at http://localhost:${PORT}`);
});

// Export the server instance for tests (chai-http, etc.)
module.exports = server;