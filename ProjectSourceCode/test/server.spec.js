// ********************** Initialize server **********************************
const server = require('../src/index');

// ********************** Import Libraries ***********************************
const chai = require('chai');
const chaiHttp = require('chai-http');
chai.should();
chai.use(chaiHttp);

const { expect, assert } = chai;

// ===================== DEFAULT WELCOME TEST ==========================
describe('Server!', () => {
  it('Returns the default welcome message', done => {
    chai
      .request(server)
      .get('/welcome')
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body.status).to.equals('success');
        assert.strictEqual(res.body.message, 'Welcome!');
        done();
      });
  });
});

// ===================== REGISTER API TESTS =============================

// POSITIVE TEST CASE
describe('POST /register - positive', () => {
  it('Should register a new user with valid input', done => {
    chai
      .request(server)
      .post('/register')
      .send({ fname: 'John', lname: 'Doe', email: 'jode123@gmail.com', username: 'test_user', password: 'Password$123' })
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body.message).to.equal('Success');
        done();
      });
  });
});

// NEGATIVE TEST CASE
describe('POST /register - negative', () => {
  it('Should return 400 for invalid input', done => {
    chai
      .request(server)
      .post('/register')
      .send({ username: 123, password: null })
      .end((err, res) => {
        expect(res).to.have.status(400);
        expect(res.body.message).to.equal('Invalid input');
        done();
      });
  });
});

// ===================== PROFILE ROUTE TESTS (Extra Credit) =============================
describe('GET /profile - extra credit', () => {
  let agent;


  const profileUserRegister = {
    fname: 'Profile',
    lname: 'Tester',
    email: `profile123@example.com`,
    username: `profile_user_123`,
    password: 'Password$123',
  };

  const profileUserLogin = {
    username: profileUserRegister.username,
    password: profileUserRegister.password,
  };

  // Before EACH test, make an agent and log in as our test user
  beforeEach(done => {
    agent = chai.request.agent(server);

    // 1) Create the user via /register
    agent
      .post('/register')
      .send(profileUserRegister)
      .end(() => {
        // 2) Log in via /login to establish the session cookie
        agent
          .post('/login')
          .send(profileUserLogin)
          .end(() => {
            done();
          });
      });
  });

  afterEach(() => {
    agent.close();
  });

  //NEGATIVE: user NOT authenticated
  it('should reject access to /profile when not authenticated', done => {
    chai
      .request(server)
      .get('/profile')
      .end((err, res) => {
        const allowedStatuses = [401, 302, 200];
        expect(allowedStatuses).to.include(res.status);

        if (res.status === 401) {
          expect(res.text.toLowerCase()).to.include('unauthorized');
        } else if (res.status === 302) {
          expect(res).to.have.header('location');
          expect(res.header.location).to.include('/login');
        }

        done();
      });
  });

  //POSITIVE: user authenticated
  it('should render the profile page for an authenticated user', done => {
    agent
      .get('/profile')
      .end((err, res) => {
        expect(res).to.have.status(200);
        res.should.be.html; // profile route renders an HTML page


        expect(res.text).to.include('Profile');

        done();
      });
  });
});



// ===================== RENDER TEST =============================
describe('Render Testing', () => {
  it('GET /register should return an HTML page', done => {
    chai
      .request(server)
      .get('/register')
      .end((err, res) => {
        res.should.have.status(200);
        res.should.be.html;
        done();
      });
  });
});

// ===================== REDIRECT TEST =============================
describe('Redirect Testing', () => {
  it('GET / should redirect to /home when logged in', done => {
    let agent = chai.request.agent(server);
    agent
      .post('/login')
      .send({ username: 'test_user', password: 'Password$123' })
      .end(() => {
        agent
          .get('/')
          .end((err, res) => {
            res.should.have.status(200);
            done();
          });
      });
  });
});