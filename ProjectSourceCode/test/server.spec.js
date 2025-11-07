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
      .redirects(0)
      .send({ username: 'test_user', password: 'password123' })
      .end((err, res) => {
        expect(res).to.have.status(302);
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
      .send({ username: 'test_user', password: 'password123' })
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