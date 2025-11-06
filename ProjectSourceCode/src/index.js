const express = require('express');
const app = express();
const handlebars = require('express-handlebars');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');

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
app.get('/', (req, res) => {
  if (req.session.user) return res.redirect('/home');
  res.render('pages/login', { title: 'Login', pageClass: 'login-page' });
});

app.get('/register', (req, res) => {
    if (req.session.user) return res.redirect('/home');
    res.render('pages/register', { title: 'Register', pageClass: 'register-page' });
  });

// HANDLE LOGIN //
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'googlygambler' && password === 'googlygambler') {
    req.session.user = { username };
    return res.redirect('/transition');
  }
  res.render('pages/login', {
    title: 'Login',
    pageClass: 'login-page',
    error: true,
    message: 'Invalid username or password. Try "gamble" / "gamble".'
  });
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));