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
  host: "db",
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
    // Wallet
    case 'wallet_add': return 'Add Credits';

    // Slots
    case 'Slots Spin': return 'Slots Spin';
    case 'Slots Win': return 'Slots Win';
    case 'slots': return 'Slots Spin';    // legacy code type

    // Blackjack
    case 'Blackjack Bet': return 'Blackjack Bet';
    case 'Blackjack Win': return 'Blackjack Win';
    case 'Blackjack Loss': return 'Blackjack Loss';
    case 'Blackjack Push': return 'Blackjack Push (Tie)';
    case 'Blackjack Double': return 'Blackjack Double Down';
    case 'Blackjack Result': return 'Blackjack Result';

    // Mines
    case 'Mines Bet': return 'Mines Bet';
    case 'Mines Win': return 'Mines Win';
    case 'Mines Loss': return 'Mines Loss';
    case 'Mines Cashout': return 'Mines Cashout';

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
    res.locals.wins = req.session.user.wins;
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
      wins: user.wins || 0
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

  // detect if this is a JSON / test request
  const wantsJson =
    req.is('application/json') ||
    (req.get('Accept') || '').includes('application/json');

  if (typeof username !== 'string' || typeof password !== 'string') {
    if (wantsJson) {
      // what the negative test expects
      return res.status(400).json({ message: 'Invalid input' });
    }

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
    if (wantsJson) {
      // also treat this as invalid input for the test
      return res.status(400).json({ message: 'Invalid input' });
    }

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
      if (wantsJson) {
        return res.status(400).json({ message: 'Username already taken' });
      }

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

    if (wantsJson) {
      // Positive test case
      return res.status(200).json({ message: 'Success' });
    }

    return renderLoginPage(res, {
      success: true,
      message: 'Account created. Please log in.',
    });
  } catch (err) {
    console.error('Registration error:', err);

    if (wantsJson) {
      return res.status(500).json({ message: 'Something went wrong' });
    }

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
  //Determine if this is a win (increment wins count)
  const addWin = type.includes('Win') ? 1 : 0;

  return db.tx(async t => {
    const updated = await t.one(
      `UPDATE users
       SET balance = balance + $1,
       wins = wins + $2
       WHERE user_id = $3
       RETURNING user_id, username, balance, wins`,
      [deltaAmount, addWin, userId]
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
  const user = req.session.user;
  if (!bet || bet <= 0)
    return res.status(400).json({ error: 'Invalid bet amount.' });

  try {
    const freshUser = await db.one(
      'SELECT user_id, balance, wins FROM users WHERE user_id = $1',
      [user.user_id]
    );

    if (bet > freshUser.balance)
      return res.status(400).json({ error: 'Insufficient balance.' });

    const updatedUser = await recordTransaction(
      req.session.user.user_id,
      -bet,
      'Blackjack Bet',
      `Started Blackjack bet of ${bet}`
    );

    req.session.user.balance = updatedUser.balance;
    req.session.user.wins = updatedUser.wins;

    res.json({ ok: true, newBalance: updatedUser.balance });
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
  } else if (result === 'push') {
    type = 'Blackjack Push';
    desc = `Push, returned ${payout}`;
  }

  try {
    let updated;

    if (payout > 0) {
      // Apply payout, increment wins if type contains 'Win'
      updated = await recordTransaction(
        req.session.user.user_id,
        payout,
        type,
        desc
      );
    } else {
      // Just refresh the user from DB if nothing to pay
      updated = await db.one(
        'SELECT user_id, username, balance, wins FROM users WHERE user_id = $1',
        [req.session.user.user_id]
      );
    }

    req.session.user.balance = updated.balance;
    req.session.user.wins = updated.wins;

    return res.json({
      ok: true,
      newBalance: updated.balance,
      wins: updated.wins,
    });
  } catch (err) {
    console.error('Blackjack settle error:', err);
    return res.status(500).json({ error: 'Server error.' });
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

  if (!bet || bet <= 0) {
    return res.status(400).json({ error: 'Invalid bet amount.' });
  }
  const user_id = req.session.user.user_id;

  // Refresh user balance from DB
  try {
    const freshUser = await db.one(
      'SELECT user_id, balance, wins FROM users WHERE user_id = $1',
      [user_id]
    );
    req.session.user.balance = freshUser.balance;
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

    const netWin = payout - bet; // how much the player actually profits
    // Log/subtract the bet
    await recordTransaction(
      user_id,
      -bet,
      'Slots Spin',
      `Slots spin bet ${bet}`
    );

    let updatedUser;

    // Log/add payout and increment wins
    if (payout > 0) {
      updatedUser = await recordTransaction(
        user_id,
        payout,
        'Slots Win',
        `Slots payout ${payout} on bet ${bet}`
      );
    } else {
      //No win/payout, just get current balance
      updatedUser = await db.one(
        'SELECT user_id, balance FROM users WHERE user_id = $1',
        [user_id]
      );
    }
    //Keep session user data consistent
    req.session.user.balance = updatedUser.balance;
    req.session.user.wins = updatedUser.wins;
    res.json({
      reels,
      payout: netWin,      // return net winnings
      newBalance: updatedUser.balance,
    });

  } catch (err) {
    console.error('Slots spin error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// MINES
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

  if (resultType === 'loss' || amount === 0) {
    type = 'Mines Loss';
    desc = 'Lost Mines round';
  } else if (resultType === 'win') {
    type = 'Mines Win';
    desc = `Full clear +${amount}`;
  }

  try {
    if (amount > 0) {
      const updated = await recordTransaction(
        req.session.user.user_id,
        amount,
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
    console.error('Mines cashout error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// *****************************************************
// LEADERBOARD
// *****************************************************

app.get('/leaderboard', requireAuth, async (req, res) => {
  const backgroundLayers = [
    'neon-clouds dim',
    'caustics softer',
    'bloom-overlay subtle',
    'neon-dots',
  ];

  // Temporary mock data
  const rawLeaderboard = [
    { rank: 1, username: 'fish', balance: 12500, status: 'Legend' },
    { rank: 2, username: 'this fish', balance: 11340, status: 'Diamond' },
    { rank: 3, username: 'that fish', balance: 9980, status: 'Platinum' },
    { rank: 4, username: 'other fish', balance: 8740, status: 'Gold' },
    { rank: 5, username: 'yay fish!', balance: 8210, status: 'Gold' },
  ];

  const maxBalance = Math.max(...rawLeaderboard.map(p => p.balance));

  const leaderboard = rawLeaderboard.map(p => ({
    ...p,
    progress: Math.round((p.balance / maxBalance) * 100),
  }));

  const query = `SELECT * FROM users;`;
  const query2 = `SELECT u.user_id, u.username, b.wins, b.best_score, b.updated_at
                  FROM blackjack_leaderboard b
                  JOIN users u ON u.user_id = b.user_id
                  ORDER BY b.wins DESC
                  LIMIT 10`;

  try {
    const hello = await db.any(query);
    const result2 = await db.any(query2);

    res.render('pages/leaderboard', {
      hello,
      leaderboard,
      blackjackLeaders: result2,
      title: 'Betwise — Leaderboard',
      pageClass: 'leaderboard-page ultra-ink',
      backgroundLayers,
      siteName: 'BETWISE',
    });
  } catch (err) {
    console.error(err);
    res.render('pages/leaderboard', {
      users: [],
      error: 'Failed to load leaderboard',
      title: 'Betwise — Leaderboard',
      pageClass: 'leaderboard-page ultra-ink',
      backgroundLayers,
      siteName: 'BETWISE',
    });
  }
});

// *****************************************************
// WALLET
// *****************************************************

// WALLET PAGE
app.get('/wallet', requireAuth, async (req, res) => {
  try {
    const user_id = req.session.user.user_id;
    const result = await db.one('SELECT user_id, username, balance, wins FROM users WHERE user_id = $1',
      [user_id]
    );

    //Debug: check that wins increment properly
    console.log(`User ${result.username} has ${result.wins} wins.`);

    if (result && result.balance != null) {
      req.session.user.balance = Number(result.balance);
    }

    const transactions = await getUserTransactions(user_id);

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