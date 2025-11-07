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
  host: 'localhost',
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port: 5432,
});


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
app.use(session({ secret: 'dev_secret_key', saveUninitialized: false, resave: false }));

// auth middleware
function requireAuth(req, res, next) {
  if (!req.session.user) return res.redirect('/');
  next();
}

// LOGIN PAGE //
app.get('/login', (req, res) => {
  if (req.session.user) return res.redirect('/home');
  res.render('pages/login', { title: 'Login', pageClass: 'login-page' });
});

app.get('/', (req, res) => {
  if (req.session.user) return res.redirect('/home');
  res.render('pages/login', { title: 'Login', pageClass: 'login-page' });
});

app.get('/register', (req, res) => {
  if (req.session.user) return res.redirect('/home');
  res.render('pages/register', { title: 'Register', pageClass: 'register-page' });
});

// HANDLE REGISTRATION 
app.post('/register', async (req, res) => {
  const { username, password } = req.body;
  const cleanUsername = username ? username.trim() : '';
  console.log('REGISTER BODY:', req.body); // DEBUG
  try {
    // 1) Check if username already exists 
    const existing = await pool.query('SELECT 1 FROM users WHERE username = $1', [cleanUsername]);
    console.log('REGISTER existing.rowCount:', existing.rowCount); // DEBUG
    if (existing.rowCount > 0) {
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
      [username, hashedPassword]);
    //req.session.user = { id: result.rows[0].user_id, username: result.rows[0].username };
    console.log('REGISTER inserted user:', result.rows[0]); // DEBUG
    res.redirect('/transition');
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
    const result = await pool.query('SELECT user_id, username, password_hash FROM users WHERE username = $1', [username]);
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
    } // 4) Successful login 
    req.session.user = { id: user.user_id, username: user.username , password: user.password_hash };
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

// HOME PAGE //
app.get('/home', requireAuth, (req, res) => {
  res.render('pages/home', {
    title: 'Play',
    pageClass: 'home-page ultra-ink',
    user: req.session.user
  });
});

// GAME ROUTES //
app.get('/blackjack', (req, res) => {
  res.render('pages/blackjack', {
    title: 'Betwise — Blackjack',
    pageClass: 'home-page ultra-ink blackjack-page'
  });
});

app.get('/slots', (req, res) => {
  res.render('pages/slots', {
    title: 'Betwise — Slots',
    pageClass: 'home-page ultra-ink slots-page'
  });
});

app.get('/mines', (req, res) => {
  res.render('pages/mines', {
    title: 'Betwise — Mines',
    pageClass: 'home-page ultra-ink mines-page'
  });
});


// LOGOUT //
app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

// DEV ONLY: inspect users in the database
app.get('/dev/users', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT user_id, username, password_hash FROM users'
    );
    console.log('DEV /dev/users:', result.rows); // DEBUG
    res.json(result.rows);
  } catch (err) {
    console.error('DEV /dev/users ERROR:', err);
    res.status(500).send('Error fetching users');
  }
});




const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));