var zlib = require('zlib')
var http = require('http')

module.exports = mock

function mock (data) {
  var emits = data.slice()
  var server = http.createServer(handler)

  return server

  function handler (req, res) {
    var buf = ''

    req.on('data', function (data) {
      buf += data

      if (buf.length === Number(req.headers['content-length'])) {
        sendData()
      }
    })

    function sendData () {
      var gzip = zlib.createGzip()

      gzip.pipe(res)

      var interval = setInterval(function () {
        if (!emits.length) {
          clearInterval(interval)
          gzip.end()

          return
        }

        gzip.write(JSON.stringify(emits.shift()) + '\n')
      }, 10)
    }
  }
}
