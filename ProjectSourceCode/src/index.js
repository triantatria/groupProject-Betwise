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

// HOME PAGE //
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

app.get('/slots', requireAuth, (req, res) => {

  const backgroundLayers = [
    "neon-clouds dim",
    "caustics softer",
    "bloom-overlay subtle",
    "neon-dots"
  ];

  res.render('pages/slots', {
    title: 'Betwise — Slots',
    pageClass: 'slots-page ultra-ink',
    siteName: 'BETWISE',
    backgroundLayers,
    user: req.session.user
  });
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

// LOGOUT //
app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));