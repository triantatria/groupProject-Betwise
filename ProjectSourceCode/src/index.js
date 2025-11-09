// ================= SETUP ==================
const express = require('express');
const app = express();
const handlebars = require('express-handlebars');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const pgp = require('pg-promise')();

const db = pgp({
  host: 'db',
  port: 5432,
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD
});

// ================= HANDLEBARS ==================
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

// ================= LOGIN VIEW ==================
app.get('/', (req, res) => {
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

// ================= REGISTER API (USED IN TESTS) ==================
app.post("/register", async (req, res) =>{
    const username = req.body.username;
    const hash = await bcrypt.hash(req.body.password, 10);
    
    const query =  `INSERT INTO users (username, password)
                    VALUES ($1, $2)
                    RETURNING *`;
    try{
       const iUser = await db.one(query, [username, hash]);
       res.status(200).redirect('/');
    }catch(err){
        console.log(err);
        const errMessage = "Username already exists";
        res.status(200).render("pages/register", {message: err, error: true});
    }
});
/*app.post("/register", async (req, res) =>{
    const username = req.body.username;
    const password = req.body.password;
    const hash = req.body.password;//await bcrypt.hash(req.body.password, 10);
    
    if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ message: 'Invalid input' });
      }

    const query =  `INSERT INTO users (username, password)
                    VALUES ($1, $2)
                    RETURNING *`;
    try{
       const iUser = await db.one(query, [username, hash]);
       res.redirect('/');
       res.status(200);
    }catch(err){
        console.log(err);
        const errMessage = "Username already exists";
        res.render("pages/register", {message: errMessage, error: true});
    }
});*/
/*app.post('/register', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ message: 'Invalid input' });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    await db.none(
      `INSERT INTO users (username, password)
       VALUES ($1, $2)`,
      [username, hash]
    );
    res.redirect('/');
    return res.status(200).json({ message: 'Success' });
  } catch (err) {
    return res.status(400).json({ message: 'User already exists' });
  }
});*/

// ================= LOGIN API ==================
app.post("/login", async (req, res) =>{
    const username = req.body.username;
    const password = req.body.password;
    
    const query =  `SELECT * FROM users 
                    WHERE users.username = $1 `;
    try{
      const user = await db.oneOrNone(query, [username]);
      
      if(!user){
        errMessage = "User does not exist";
        res.status(400);
        return res.render("pages/register", { message: errMessage, error: true });
      }
  
      const match = await bcrypt.compare(req.body.password, user.password);
      if(!match){
        const errMessage = "Incorrect username or password.";
        return res.render("pages/login", { message: errMessage, error: true });
      }
      req.session.user = user;
      req.session.save(() => {
        res.status(200);
        res.redirect("/home");
      });
    }catch(err){
      console.log(err);
      const errMessage = "Something went wrong. Please try again.";
      res.render("pages/login", { message: errMessage, error: true });
    }
  });
/*app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  const user = await db.oneOrNone('SELECT * FROM users WHERE username=$1', [username]);
  if (!user) {
    return res.status(400).render('pages/login', { error: true, message: 'Invalid credentials' });
  }

  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return res.status(400).render('pages/login', { error: true, message: 'Invalid credentials' });
  }

  req.session.user = { username };
  res.status(200);
  req.session.save(() => res.redirect('/home'));
});*/

// ================= TRANSITION ==================
app.get('/transition', requireAuth, (req, res) => {
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

// ================= LOGOUT ==================
app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/'));
});

// ================= TEST ROUTE ==================
app.get('/welcome', (req, res) => {
  res.json({ status: 'success', message: 'Welcome!' });
});

// ================= EXPORT SERVER FOR TESTS ==================
module.exports = app.listen(3000);