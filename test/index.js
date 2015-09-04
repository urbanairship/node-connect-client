var http = require('http')

var test = require('tape')
var findPort = require('find-port')

var connect = require('../')
var mockConnect = require('./mock')

test('posts to provided URL with provided basic auth', function (t) {
  t.plan(6)

  var toWrite = {whatever: 'who cares'}
  var server
  var stream

  findPort(8000, 9000, setupServer)

  function setupServer (ports) {
    var port = ports[0]

    server = http.createServer(checkRequest).listen(port, runTests)

    function runTests () {
      stream = connect('user1', 'hunter2', {uri: 'http://localhost:' + port})
      stream.write(toWrite)
    }
  }

  function checkRequest (req, res) {
    t.equal(req.method.toLowerCase(), 'post')
    t.equal(
      req.headers.accept,
      'application/vnd.urbanairship+x-ndjson;version=3;'
    )
    t.equal(req.headers['content-type'], 'application/json')
    t.equal(
      req.headers['content-length'],
      JSON.stringify(toWrite).length.toString()
    )
    t.equal(req.headers.authorization, authHeader('user1', 'hunter2'))

    req.on('data', function (data) {
      t.equal(data.toString(), JSON.stringify(toWrite))
      res.end()
      server.close()
      stream.end()
      t.end()
    })
  }
})

test('sets a cookie for redirect', function (t) {
  t.plan(1)

  var server
  var stream

  findPort(8000, 9000, setupServer)

  function setupServer (ports) {
    var port = ports[0]

    server = http.createServer(redirectHandler).listen(port, runTests)

    function runTests () {
      stream = connect('x', 'x', {uri: 'http://localhost:' + port})

      stream.write({whatever: 'who cares'})
    }
  }

  function redirectHandler (req, res) {
    if (req.headers.cookie) {
      t.equal(req.headers.cookie, 'chocolate-chip')
      res.end()
      server.close()
      stream.end()
      t.end()
    } else {
      res.setHeader('set-cookie', ['chocolate-chip'])
      res.statusCode = 307
      res.end()
    }
  }
})

test('emits data objects', function (t) {
  t.plan(3)

  var data = [
    {lol: true},
    {cats: ['garfield', 'top cat']},
    {x: 1, y: -1, z: 10000}
  ]
  var server
  var stream

  findPort(8000, 9000, setupMock)

  function setupMock (ports) {
    var port = ports[0]

    server = mockConnect(data)

    server.listen(port, runTests)

    function runTests () {
      stream = connect('x', 'x', {uri: 'http://localhost:' + port})

      var counter = 0

      stream.on('data', function (x) {
        t.deepEqual(x, data[counter])

        if (++counter === data.length) {
          server.close()
          t.end()
        }
      })

      stream.end({merp: 'lol'})
    }
  }
})

function authHeader (user, pass) {
  return 'Basic ' + new Buffer(user + ':' + pass, 'binary').toString('base64')
}
