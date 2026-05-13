var http = require('http');
var app = require('../app');
var mongoose = require('mongoose');
var User = require('../user/user');

var server;
var baseUrl;

function request(options, body) {
  return new Promise(function (resolve, reject) {
    var req = http.request(options, function (res) {
      var data = '';
      res.on('data', function (chunk) { data += chunk; });
      res.on('end', function () {
        try { data = JSON.parse(data); } catch (e) {}
        resolve({ status: res.statusCode, body: data });
      });
    });
    req.on('error', reject);
    if (body) {
      var payload = new URLSearchParams(body).toString();
      req.setHeader('Content-Type', 'application/x-www-form-urlencoded');
      req.setHeader('Content-Length', Buffer.byteLength(payload));
      req.write(payload);
    }
    req.end();
  });
}

function opts(method, path) {
  return { hostname: 'localhost', port: server.address().port, method: method, path: path };
}

describe('UserManager API', function () {
  beforeAll(function (done) {
    mongoose.connect(process.env.DB_URL || 'mongodb://localhost:27017/usermanager_test', { useMongoClient: true });
    mongoose.connection.once('connected', function () {
      server = http.createServer(app).listen(0, done);
    });
  });

  afterAll(function (done) {
    server.close(function () {
      mongoose.connection.db.dropDatabase(function () {
        mongoose.disconnect(done);
      });
    });
  });

  describe('GET /', function () {
    it('returns a welcome message', function (done) {
      request(opts('GET', '/')).then(function (res) {
        expect(res.status).toBe(200);
        expect(res.body).toContain('Welcome');
        done();
      });
    });
  });

  describe('POST /users', function () {
    it('creates a new user', function (done) {
      request(opts('POST', '/users'), { name: 'Alice', email: 'alice@example.com', password: 'secret' }).then(function (res) {
        expect(res.status).toBe(200);
        expect(res.body.name).toBe('Alice');
        expect(res.body.email).toBe('alice@example.com');
        done();
      });
    });
  });

  describe('GET /users', function () {
    it('returns an array of users', function (done) {
      request(opts('GET', '/users')).then(function (res) {
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        done();
      });
    });
  });

  describe('GET /users/:id', function () {
    var userId;

    beforeAll(function (done) {
      User.create({ name: 'Bob', email: 'bob@example.com', password: 'pass' }, function (err, user) {
        userId = user._id.toString();
        done();
      });
    });

    it('returns a single user by id', function (done) {
      request(opts('GET', '/users/' + userId)).then(function (res) {
        expect(res.status).toBe(200);
        expect(res.body.name).toBe('Bob');
        done();
      });
    });

    it('returns 404 for a non-existent id', function (done) {
      request(opts('GET', '/users/000000000000000000000000')).then(function (res) {
        expect(res.status).toBe(404);
        done();
      });
    });
  });

  describe('PUT /users/:id', function () {
    var userId;

    beforeAll(function (done) {
      User.create({ name: 'Carol', email: 'carol@example.com', password: 'pass' }, function (err, user) {
        userId = user._id.toString();
        done();
      });
    });

    it('updates a user', function (done) {
      request(opts('PUT', '/users/' + userId), { name: 'Carol Updated' }).then(function (res) {
        expect(res.status).toBe(200);
        expect(res.body.name).toBe('Carol Updated');
        done();
      });
    });
  });

  describe('DELETE /users/:id', function () {
    var userId;

    beforeAll(function (done) {
      User.create({ name: 'Dave', email: 'dave@example.com', password: 'pass' }, function (err, user) {
        userId = user._id.toString();
        done();
      });
    });

    it('deletes a user', function (done) {
      request(opts('DELETE', '/users/' + userId)).then(function (res) {
        expect(res.status).toBe(200);
        expect(res.body).toContain('Dave');
        done();
      });
    });
  });
});
