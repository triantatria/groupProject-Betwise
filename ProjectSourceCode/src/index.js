// *****************************************************
// <!-- Section 1 : Import Dependencies -->
// *****************************************************

const express = require('express'); // To build an application server or API
const app = express();
const handlebars = require('express-handlebars');
const Handlebars = require('handlebars');
const path = require('path');
const pgp = require('pg-promise')(); // To connect to the Postgres DB from the node server
const bodyParser = require('body-parser');
const session = require('express-session'); // To set the session object. To store or access session data, use the `req.session`, which is (generally) serialized as JSON by the store.
const bcrypt = require('bcryptjs'); //  To hash passwords
const axios = require('axios'); // To make HTTP requests from our server. We'll learn more about it in Part C.

// *****************************************************
// <!-- Section 2 : Connect to DB -->
// *****************************************************

// create `ExpressHandlebars` instance and configure the layouts and partials dir.
const hbs = handlebars.create({
  extname: 'hbs',
  layoutsDir: __dirname + '/views/layouts',
  partialsDir: __dirname + '/views/partials',
});

// database configuration
const dbConfig = {
  host: 'db', // the database server
  port: 5432, // the database port
  database: process.env.POSTGRES_DB, // the database name
  user: process.env.POSTGRES_USER, // the user account to connect with
  password: process.env.POSTGRES_PASSWORD, // the password of the user account
};

const db = pgp(dbConfig);

// test your database
db.connect()
  .then(obj => {
    console.log('Database connection successful'); // you can view this message in the docker compose logs
    obj.done(); // success, release the connection;
  })
  .catch(error => {
    console.log('ERROR:', error.message || error);
  });

// *****************************************************
// <!-- Section 3 : App Settings -->
// *****************************************************

// Register `hbs` as our view engine using its bound `engine()` function.
app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.json()); // specify the usage of JSON for parsing request body.

// initialize session variables
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    saveUninitialized: false,
    resave: false,
  })
);

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

// *****************************************************
// <!-- Section 4 : API Routes -->
// *****************************************************
// TODO - Include your API routes here
/*app.get("/", async (req, res) =>{
    res.render('pages/login');
})

app.get("/login", async (req, res) =>{
  res.render('pages/login');
})

app.post("/", async (req, res) =>{
  const username = req.body.username;
  const password = req.body.password;
  
  const query =  `SELECT * FROM users 
                  WHERE users.username = $1 `;
  try{
    const user = await db.oneOrNone(query, [username]);
    
    if(!user){
      errMessage = "User does not exist";
      return res.render("pages/register", { message: errMessage, error: true });
    }

    const match = await bcrypt.compare(req.body.password, user.password);
    if(!match){
      const errMessage = "Incorrect username or password.";
      return res.render("pages/login", { message: errMessage, error: true });
    }
    req.session.user = user;
    req.session.save(() => {
      res.redirect("/discover");
    });
  }catch(err){
    console.log(err);
    const errMessage = "Something went wrong. Please try again.";
    res.render("pages/login", { message: errMessage, error: true });
  }
});

app.get("/register", async (req, res) =>{
    res.render('pages/register');
})

app.post("/register", async (req, res) =>{
    const username = req.body.username;
    const hash = await bcrypt.hash(req.body.password, 10);
    
    const query =  `INSERT INTO users (username, password)
                    VALUES ($1, $2)
                    RETURNING *`;
    try{
       const iUser = await db.one(query, [username, hash]);
       res.redirect('/');
    }catch(err){
        console.log(err);
        const errMessage = "Username already exists";
        res.render("pages/register", {message: errMessage, error: true});
    }
});

//Lines 133-142 from lab write up
// Authentication Middleware.
const auth = (req, res, next) => {
  if (!req.session.user) {
    // Default to login page.
    return res.redirect('/');
  }
  next();
};
// Authentication Required
app.use(auth);

app.get('/discover', async (req, res) => {

  try {

    const response = await axios({
      url: 'https://app.ticketmaster.com/discovery/v2/events.json',
      method: 'GET',
      headers: { 'Accept-Encoding': 'application/json' },
      params: {
        apikey: process.env.API_KEY,
        classificationName: 'music', //ticket master api
        size: 12,
      },
    });

    const results = response.data._embedded.events;

    console.log(results);

    res.render('pages/discover', { results });

  } catch (err) {
    res.render('pages/discover', { results: [], message: 'Failed to get events.', error: true });
  }
});


app.get("/logout", async (req, res) =>{
  req.session.destroy((err) => { //lab write up and stack overflow to catch error
    if (err) {
      return res.render('pages/logout', { message: 'Error logging out.', error: true });
    }
  });

  res.render('pages/logout', { message: 'Logged out Successfully', error: false });
})*/






    



// *****************************************************
// <!-- Section 5 : Start Server-->
// *****************************************************
// starting the server and keeping the connection open to listen for more requests
app.listen(3000);
console.log('Server is listening on port 3000');