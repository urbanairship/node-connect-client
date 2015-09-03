var http = require('http')

var test = require('tape')
var findPort = require('find-port')

var connect = require('../')

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
