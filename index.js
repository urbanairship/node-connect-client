var zlib = require('zlib')
var https = require('https')
var http = require('http')
var url = require('url')

var through = require('through2').obj
var extend = require('xtend')
var split = require('split')

var HEADERS = {
  'Accept': 'application/vnd.urbanairship+x-ndjson;version=3;',
  'Content-Type': 'application/json'
}

var CONNECT_URL = 'https://connect.urbanairship.com/api/events/'

module.exports = eagleCreek

function eagleCreek (user, pass, _opts) {
  var opts = _opts || {}
  var stream = through(write, end)
  var headers = extend(HEADERS, {})
  var apiUrl = url.parse(opts.uri || CONNECT_URL)
  var protocol = apiUrl.protocol === 'https:' ? https : http
  var ended = false

  var filter = null
  var request = null
  var currentOffset = null

  return stream

  function startRequest () {
    var connectFilter = extend(filter, {})

    if (!connectFilter.resume_offset && currentOffset) {
      connectFilter.resume_offset = currentOffset
    }

    request = protocol.request(extend(apiUrl, {
      method: 'POST',
      auth: user + ':' + pass,
      headers: extend(headers, contentLength(connectFilter))
    }), gotResponse)

    request.on('error', emitError)
    request.on('end', checkReconnect)

    request.write(JSON.stringify(connectFilter))
  }

  function contentLength (body) {
    return {'Content-Length': JSON.stringify(body).length}
  }

  function checkReconnect () {
    if (!ended) {
      startRequest()
    }
  }

  function gotResponse (response) {
    if (response.statusCode === 307 && response.headers['set-cookie']) {
      headers.Cookie = response.headers['set-cookie'][0]
      checkReconnect()

      return
    }

    if (response.statusCode !== 200) {
      stream.emit(
        'error',
        new Error(response.statusCode + ': ' + response.statusMessage)
      )

      return
    }

    response.on('end', checkReconnect)
    response.pipe(zlib.createGunzip()).pipe(split()).on('data', emitData)
  }

  function emitData (data) {
    if (!data.length) {
      return
    }

    try {
      var parsed = JSON.parse(data)

      currentOffset = parsed.offset

      stream.push(parsed)
    } catch (err) {
      stream.emit('error', err)
    }
  }

  function write (data, _, next) {
    filter = data
    currentOffset = null

    if (request) {
      request.end()
    } else {
      startRequest()
    }

    next()
  }

  function end (done) {
    ended = true

    if (request) {
      request.end()
    }

    done()
  }

  function emitError (err) {
    stream.emit('error', err)
  }
}
