// ================= SETUP ==================
const express = require('express');
const app = express();
const handlebars = require('express-handlebars');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcryptjs'); //  To hash passwords
require('dotenv').config(); // Load environment variables
const { Pool } = require('pg'); // PostgreSQL client

// Database connection setup
const pool = new Pool({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST || 'localhost',
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port: 5432,
});


// Handlebars setup
const hbs = handlebars.create({
  extname: 'hbs',
  layoutsDir: path.join(__dirname, 'views/layouts'),
  partialsDir: path.join(__dirname, 'views/partials'),
  defaultLayout: 'main',
});

app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

app.use('/resources', express.static(path.join(__dirname, 'resources')));
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
  res.status(302).render('pages/login', { title: 'Login', pageClass: 'login-page' });
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
  if (!username || !password) {
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
    const result = await pool.query('SELECT user_id, username, password_hash FROM users WHERE username = $1', [cleanUsername]);
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
    req.session.user = { id: user.user_id, username: user.username };
    res.redirect('/transition');
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
app.get('/transition', (req, res) => {
  if (!req.session.user) return res.redirect('/');
  res.render('pages/transition', { title: 'Flowing...', pageClass: 'transition-page' });
});

// ================= HOME ==================
app.get('/home', requireAuth, (req, res) => {
  res.render('pages/home', {
    title: 'Play',
    pageClass: 'home-page ultra-ink',
    user: req.session.user
  });
});

// ================= GAME ROUTES ==================
app.get('/blackjack', requireAuth, (req, res) => {
  res.render('pages/blackjack', {
    title: 'Betwise — Blackjack',
    pageClass: 'home-page ultra-ink blackjack-page'
  });
});

app.get('/slots', requireAuth, (req, res) => {
  res.render('pages/slots', {
    title: 'Betwise — Slots',
    pageClass: 'home-page ultra-ink slots-page'
  });
});

app.get('/mines', requireAuth, (req, res) => {
  res.render('pages/mines', {
    title: 'Betwise — Mines',
    pageClass: 'home-page ultra-ink mines-page'
  });
});

// ================= SLOTS API ==================
app.post('/api/slots/spin', (req, res) => {
  const { bet } = req.body;
  if (!bet || bet <= 0) {
    return res.status(400).json({ error: 'Invalid bet amount.' });
  }

  // In your real app, you'd load the player's balance from DB/session
  let balance = 1000; // temporary demo value

  // Weighted symbol list (more common ones appear more often)
  const symbols = ['🍒','🍒','🍒','🍋','🍋','🍋','🍊','🍊','🍉','⭐','💎'];

  // Spin 3 reels
  const reels = Array.from({ length: 3 }, () => 
    symbols[Math.floor(Math.random() * symbols.length)]
  );

  // Calculate payout
  const [a, b, c] = reels;
  let payout = 0;

  // --- PAYOUT LOGIC ---
  if (a === b && b === c) {
    // 3 of a kind
    if (a === '💎') payout = bet * 10;
    else if (a === '🍒') payout = bet * 3;
    else payout = bet * 2;
  } 
  else if (a === b || b === c || a === c) {
    // 2 of a kind
    payout = bet * 2;
  } 
  else {
    // No match
    payout = 0;
  }

  // Update balance
  balance = balance - bet + payout;

  res.json({ reels, payout, balance });
});

// PROFILE PAGE (no authentication required for now)
app.get('/profile', async (req, res) => {
  try {
    // Optional: fetch some dummy data or just hardcode
    const userData = {
      username: 'DemoUser',
      email: 'demo@example.com',
    };

    res.render('pages/profile', {
      title: 'Profile',
      pageClass: 'profile-page',
      user: userData, // pass dummy data so you can style page
    });
  } catch (err) {
    console.error(err);
    res.redirect('/home'); // fallback
  }
});

app.get('/leaderboard', async (req, res) => {
  //document.getElementById("username-box").innerText = "hello";
  const query = `SELECT * FROM users;`;

  try {
    const users = await db.any(query);  
    res.render('pages/leaderboard', { users });
  } catch (err) {
    console.error(err);
    res.render('pages/leaderboard', { users: [], error: "Failed to load leaderboard" });
  }
});


// ================= TEST ROUTE ==================
app.get('/welcome', (req, res) => {
  res.json({ status: 'success', message: 'Welcome!' });
});

// ================= EXPORT SERVER FOR TESTS ==================
module.exports = app.listen(3000);