var http = require('http')
var util = require('util')
var zlib = require('zlib')

var test = require('tape')
var findPort = require('find-port')

var connect = require('../')
var mockConnect = require('./mock')

test('posts to provided URL with provided token', function (t) {
  t.plan(7)

  var toWrite = {whatever: 'who cares'}
  var server
  var stream

  findPort(8000, 9000, setupServer)

  function setupServer (ports) {
    var port = ports[0]

    server = http.createServer(checkRequest).listen(port, runTests)

    function runTests () {
      stream = connect(
        'appkey1',
        'accesstoken2',
        {uri: 'http://localhost:' + port}
      )
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
    t.equal(req.headers.authorization, 'Bearer accesstoken2')
    t.equal(req.headers['x-ua-appkey'], 'appkey1')

    req.on('data', function (data) {
      t.equal(data.toString(), JSON.stringify(toWrite))
      res.end()
      server.close()
      stream.end()
      t.end()
    })
  }
})

test('emits an error on bad JSON', function (t) {
  t.plan(1)

  var server
  var stream

  findPort(8000, 9000, setupServer)

  function setupServer (ports) {
    var port = ports[0]

    server = http.createServer(emitBad).listen(port, runTests)

    function runTests () {
      stream = connect(
        'appkey1',
        'accesstoken2',
        {uri: 'http://localhost:' + port}
      )
      stream.on('error', function (err) {
        t.ok(util.isError(err))
        stream.end()
        server.close()
        t.end()
      })
      stream.write({whatever: 'who cares'})
    }
  }

  function emitBad (req, res) {
    req.on('data', function (data) {
      var gzip = zlib.createGzip()

      gzip.pipe(res)
      gzip.end('undefined')
    })
  }
})

test('emits an error on bad encoding', function (t) {
  t.plan(1)

  var server
  var stream

  findPort(8000, 9000, setupServer)

  function setupServer (ports) {
    var port = ports[0]

    server = http.createServer(emitBad).listen(port, runTests)

    function runTests () {
      stream = connect(
        'appkey1',
        'accesstoken2',
        {uri: 'http://localhost:' + port}
      )
      stream.on('error', function (err) {
        t.ok(util.isError(err))
        stream.end()
        t.end()
      })
      stream.write({whatever: 'who cares'})
    }
  }

  function emitBad (req, res) {
    req.on('data', function (data) {
      res.end('not gzipped')
      server.close()
    })
  }
})

test('sets a cookie for redirect, emits event', function (t) {
  t.plan(2)

  var server
  var stream

  findPort(8000, 9000, setupServer)

  function setupServer (ports) {
    var port = ports[0]

    server = http.createServer(redirectHandler).listen(port, runTests)

    function runTests () {
      stream = connect('x', 'x', {uri: 'http://localhost:' + port})

      stream.once('redirect', function () {
        t.pass('event emitted')
      })

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
