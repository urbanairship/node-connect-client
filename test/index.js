var http = require('http')
var util = require('util')
var zlib = require('zlib')

var test = require('tape')
var findPort = require('portfinder').getPort

var connect = require('../')
var mockConnect = require('./mock')

test('posts to provided URL with provided token', function (t) {
  t.plan(7)

  var toWrite = { whatever: 'who cares' }
  var server
  var stream

  getPort(setupServer)

  function setupServer(port) {
    server = http.createServer(checkRequest).listen(port, runTests)

    function runTests() {
      stream = connect('appkey1', 'accesstoken2', {
        uri: 'http://localhost:' + port,
      })

      stream.write(toWrite)
    }
  }

  function checkRequest(req, res) {
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
      const gzip = zlib.createGzip()
      gzip.pipe(res)
      gzip.end()
      server.close()
      stream.end()
      t.end()
    })
  }
})

test('emits an error on bad JSON with blob attached', function (t) {
  t.plan(2)

  var server
  var stream

  getPort(setupServer)

  function setupServer(port) {
    server = http.createServer(emitBad).listen(port, runTests)

    function runTests() {
      stream = connect('appkey1', 'accesstoken2', {
        uri: 'http://localhost:' + port,
      })
      stream.on('error', function (err) {
        t.ok(util.isError(err))
        t.equal(err.blob, 'undefined')
        stream.end()
        server.close()
        t.end()
      })
      stream.write({ whatever: 'who cares' })
    }
  }

  function emitBad(req, res) {
    req.on('data', function (data) {
      var gzip = zlib.createGzip()

      gzip.pipe(res)
      gzip.end('undefined')
    })
  }
})

test('can provide custom parser', function (t) {
  t.plan(2)

  var server
  var stream

  getPort(setupServer)

  function setupServer(port) {
    server = http.createServer(emitBad).listen(port, runTests)

    function runTests() {
      stream = connect('appkey1', 'accesstoken2', {
        uri: 'http://localhost:' + port,
        parser: customParser,
      })
      stream.on('error', t.fail)
      stream.on('data', function (data) {
        t.deepEqual(data, { wacky: 'wut' })
        stream.end()
        server.close()
        t.end()
      })
      stream.write({ whatever: 'who cares' })
    }
  }

  function customParser(data) {
    t.equal(data, 'undefined')

    return { wacky: 'wut' }
  }

  function emitBad(req, res) {
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

  getPort(setupServer)

  function setupServer(port) {
    server = http.createServer(emitBad).listen(port, runTests)

    function runTests() {
      stream = connect('appkey1', 'accesstoken2', {
        uri: 'http://localhost:' + port,
      })
      stream.on('error', function (err) {
        t.ok(util.isError(err))
        server.close()
        stream.end()
        t.end()
      })
      stream.write({ whatever: 'who cares' })
    }
  }

  function emitBad(req, res) {
    req.on('data', function (data) {
      res.end('not gzipped')
    })
  }
})

test('sets a cookie for redirect, emits event', function (t) {
  t.plan(2)

  var server
  var stream

  getPort(setupServer)

  function setupServer(port) {
    server = http.createServer(redirectHandler).listen(port, runTests)

    function runTests() {
      stream = connect('x', 'x', { uri: 'http://localhost:' + port })

      stream.once('redirect', function () {
        t.pass('event emitted')
      })

      stream.write({ whatever: 'who cares' })
    }
  }

  function redirectHandler(req, res) {
    var gzip = zlib.createGzip()
    gzip.pipe(res)

    if (req.headers.cookie) {
      t.equal(req.headers.cookie, 'chocolate-chip')
      gzip.end()
      server.close()
      stream.end()
      t.end()
    } else {
      res.setHeader('set-cookie', ['chocolate-chip'])
      res.statusCode = 307
      gzip.end()
    }
  }
})

test('resumes at last offset on reconnect', function (t) {
  t.plan(1)

  var server
  var stream

  getPort(setupServer)

  function setupServer(port) {
    server = http.createServer(firstHandler).listen(port, setupStream)

    function setupStream() {
      stream = connect('x', 'x', { uri: 'http://localhost:' + port })

      stream.once('data', function () {
        server.close(restartServer)
      })

      stream.write({ whatever: 'who cares' })
    }

    function restartServer() {
      server = http.createServer(secondHandler).listen(port)
    }

    function secondHandler(req, res) {
      var buf = ''

      req.on('data', function (data) {
        buf += data
      })

      req.on('end', function () {
        t.equal(JSON.parse(buf).resume_offset, '12345')
        var gzip = zlib.createGzip()
        gzip.pipe(res)
        gzip.end()
        server.close()
        stream.end()
        t.end()
      })
    }
  }

  function firstHandler(req, res) {
    var gzip = zlib.createGzip()

    gzip.pipe(res)
    gzip.end(JSON.stringify({ offset: '12345' }) + '\n')
  }
})

test('emits data objects', function (t) {
  t.plan(3)

  var data = [
    { lol: true },
    { cats: ['garfield', 'top cat'] },
    { x: 1, y: -1, z: 10000 },
  ]
  var server
  var stream

  getPort(setupMock)

  function setupMock(port) {
    server = mockConnect(data)

    server.listen(port, runTests)

    function runTests() {
      stream = connect('x', 'x', { uri: 'http://localhost:' + port })

      var counter = 0

      stream.on('data', function (x) {
        t.deepEqual(x, data[counter])

        if (++counter === data.length) {
          server.close()
          stream.end()
          t.end()
        }
      })

      stream.write({ merp: 'lol' })
    }
  }
})

function getPort(ready) {
  findPort(readyOrError)

  function readyOrError(err, port) {
    if (err) {
      console.error('Unable to find an available port for test server')
      process.exit(1)
    }

    ready(port)
  }
}
