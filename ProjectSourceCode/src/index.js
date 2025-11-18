// ================= SETUP ==================
const express = require('express');
const app = express();
const handlebars = require('express-handlebars');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcryptjs'); //  To hash passwords
require('dotenv').config(); // Load environment variables



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

// ================= AUTH MIDDLEWARE ==================
function requireAuth(req, res, next) {
  if (!req.session.user) return res.redirect('/');
  next();
}

// LOGIN PAGE //
app.get('/login', (req, res) => {
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

app.get('/', (req, res) => {
  if (req.session.user) {
    return res.redirect('/home');   // logged in → go to home
  }
  return res.redirect('/login');    // not logged in → redirect to /login
});

// REGISTER PAGE //
app.get('/register', (req, res) => {
  if (req.session.user) return res.redirect('/home');
  res.render('pages/register', { title: 'Register', pageClass: 'register-page' });
});

// HANDLE REGISTRATION 
app.post('/register', async (req, res) => {
  let { username, password } = req.body;
  // ---------- INPUT VALIDATION (NEGATIVE TEST) ----------
  // Make sure they are strings first
  if (typeof username !== 'string' || typeof password !== 'string') {
    if (req.is('application/json')) {
      return res.status(400).json({ message: 'Invalid input' });
    }
    return res.status(400).render('pages/register', {
      title: 'Register',
      pageClass: 'register-page',
      error: true,
      message: 'Invalid input.'
    });
  }

  const cleanUsername = username.trim();
  password = password.trim();

  // Check for empty fields
  if (!cleanUsername || !password) {
    if (req.is('application/json')) {
      return res.status(400).json({ message: 'Invalid input' });
    }
    return res.status(400).render('pages/register', {
      title: 'Register',
      pageClass: 'register-page',
      error: true,
      message: 'Invalid input.'
    });
  }
  try {
    // 1) Check if username already exists 
    const existing = await pool.query('SELECT 1 FROM users WHERE username = $1', [cleanUsername]);
    console.log('REGISTER existing.rowCount:', existing.rowCount); // DEBUG
    if (existing.rowCount > 0) {
      //Negative test JSON request
      if (req.is('application/json')) {
        return res.status(400).json({ message: 'Invalid input' });
      }
      return res.render('pages/register', {
        title: 'Register',
        pageClass: 'register-page',
        error: true,
        message: 'Registration failed. Username already taken.'
      });
    }
    const hashedPassword = bcrypt.hashSync(password, 10);
    console.log('REGISTER hashedPassword:', hashedPassword); // DEBUG
    // 2) Insert new user
    const result = await pool.query('INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING user_id, username',
      [cleanUsername, hashedPassword]);
    //req.session.user = { id: result.rows[0].user_id, username: result.rows[0].username };
    console.log('REGISTER inserted user:', result.rows[0]); // DEBUG
    // Positive test + browser: always send 302 with Location + JSON body
    // If this is the test (JSON), send 302 + JSON body
    if (req.is('application/json')) {
      return res.status(302).json({ message: 'Success' });
    }
    // Normal browser form submit → redirect to transition page
    return res.redirect(302, '/transition');
  } catch (err) {
    console.error(err);
    res.render('pages/register', {
      title: 'Register',
      pageClass: 'register-page',
      error: true,
      message: 'Registration failed. Username already taken.'
    });
  }
});
// HANDLE LOGIN 
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const cleanUsername = username ? username.trim() : '';

  console.log('LOGIN BODY:', req.body); // DEBUG
  try {
    // 1) Fetch user by username 
    const result = await pool.query('SELECT user_id, username, password_hash, balance FROM users WHERE username = $1', [cleanUsername]);
    console.log('LOGIN DB RESULT:', result.rows); // DEBUG
    // 2) If user not found 
    if (result.rowCount === 0) {
      console.log('LOGIN: user not found'); // DEBUG
      return res.render('pages/login', {
        title: 'Login',
        pageClass: 'login-page',
        error: true,
        message: 'Invalid username or password.'
      });
    }
    // 3) Compare password 
    const user = result.rows[0];
    const isMatch = bcrypt.compareSync(password, user.password_hash);
    console.log('LOGIN isMatch:', isMatch); // DEBUG

    // If password does not match 
    if (!isMatch) {
      console.log('LOGIN: password mismatch'); // DEBUG
      return res.render('pages/login', {
        title: 'Login',
        pageClass: 'login-page',
        error: true,
        message: 'Invalid username or password.'
      });
    }
    // 4) Successful login 
    // Regenerate session to prevent fixation
    req.session.regenerate(err => {
      if (err) {
        console.error('Session regenerate error:', err);
        return res.render('pages/login', {
          title: 'Login',
          pageClass: 'login-page',
          error: true,
          message: 'Login error. Please try again.'
        });
      }
      req.session.user = {
        id: user.user_id,
        username: user.username,
        balance: user.balance
      };
      res.redirect('/transition');
    });

  } catch (err) {
    console.error(err);
    res.render('pages/login', {
      title: 'Login',
      pageClass: 'login-page',
      error: true,
      message: 'Invalid username or password. Please try again.'
    });
  }
});

// TRANSITION PAGE //
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
    titleText: 'BETWISE',
    subtitleText: 'Preparing your experience...',
    user: req.session.user
  });
});

// ================= HOME ==================
app.get('/home', requireAuth, (req, res) => {
  const games = [
    {
      name: "Slots",
      description: "Spin the reels and test your luck!",
      tag: "Classic",
      route: "/slots"
    },
    {
      name: "Blackjack",
      description: "Beat the dealer and hit 21.",
      tag: "Card Game",
      route: "/blackjack"
    },
    {
      name: "Mines",
      description: "Choose wisely and avoid the bombs!",
      tag: "Strategy",
      route: "/mines"
    }
  ];

  res.render('pages/home', {
    title: 'Play',
    pageClass: 'home-page ultra-ink',
    user: req.session.user,
    games
  });
});

// GAME ROUTES //
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
    siteName: 'BETWISE',
    backgroundLayers,
    user: req.session.user
  });
});

app.get('/slots', requireAuth, async (req, res) => {

  const backgroundLayers = [
    "neon-clouds dim",
    "caustics softer",
    "bloom-overlay subtle",
    "neon-dots"
  ];

  try {
    // pull fresh balance from DB
    const result = await pool.query(
      'SELECT balance FROM users WHERE user_id = $1',
      [req.session.user.id]
    );

    const balance = result.rows[0].balance;
    req.session.user.balance = balance;  // keep session in sync

    res.render('pages/slots', {
      title: 'Betwise — Slots',
      pageClass: 'slots-page ultra-ink',
      siteName: 'BETWISE',
      backgroundLayers,
      user: req.session.user,
      balance
    });
  } catch (err) {
    console.error('Error loading slots page:', err);
    res.status(500).send('Error loading slots page');
  }
});

app.post('/slots/spin', requireAuth, async (req, res) => {
  const bet = Number(req.body.bet);

  if (!bet || bet <= 0) {
    return res.status(400).json({ error: "Invalid bet amount." });
  }

  try {
    //1) pull fresh balance from DB
    const result = await pool.query(
      'SELECT balance FROM users WHERE user_id = $1',
      [req.session.user.id]
    );

    let balance = result.rows[0].balance;
    req.session.user.balance = balance;  // keep session in sync

    if (bet > balance) {
      return res.status(400).json({ error: "Insufficient balance." });
    }
    const SYMBOLS = ['🍒', '🔔', '🍋', '⭐', '7️⃣', '💎'];

    // randomly pick 3 symbols
    const reels = [
      SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
      SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
      SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]
    ];

    const [a, b, c] = reels;
    let payout = 0;

    if (a === b && b === c) {
      if (a === '💎') payout = bet * 10;
      else if (a === '🍒') payout = bet * 3;
      else payout = bet * 2;
    } else if (a === b || b === c || a === c) {
      payout = bet * 2;
    }

    // update backend balance
    balance = balance - bet + payout;
    await pool.query(
      'UPDATE users SET balance = $1 WHERE user_id = $2',
      [balance, req.session.user.id]
    );
    req.session.user.balance = balance; // keep session in sync

    res.json({
      reels,
      payout,
      newBalance: balance
    });
  }
  /* initialize balance if needed
  if (req.session.user.balance == null) {
    req.session.user.balance = 1000;
  }
  */

  catch (err) {
    console.error('Error in slots/spin:', err);
    res.status(500).json({ error: "Server error processing spin." });
  }
});


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
    siteName: 'BETWISE',
    backgroundLayers,
    user: req.session.user
  });
});

// ================= LOGOUT ==================
app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});



// ================= TEST ROUTE ==================
app.get('/welcome', (req, res) => {
  res.json({ status: 'success', message: 'Welcome!' });
});




// ================= START SERVER & EXPORT FOR TESTS ==================
const PORT = process.env.PORT || 3000;

// Start server and log a clickable link
const server = app.listen(PORT, () => {
  console.log(`Betwise server running at http://localhost:${PORT}`);
});

// Export the server instance for tests (chai-http, etc.)
module.exports = server;
