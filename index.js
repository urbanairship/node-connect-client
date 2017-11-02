var zlib = require('zlib')
var https = require('https')
var http = require('http')
var url = require('url')

var through = require('through2').obj
var split = require('split2')
var extend = require('xtend')

var HEADERS = {
  'Accept': 'application/vnd.urbanairship+x-ndjson;version=3;',
  'Content-Type': 'application/json'
}

var CONNECT_URL = 'https://connect.urbanairship.com/api/events/'

module.exports = connect

function connect (appKey, accessToken, _opts) {
  var opts = _opts || {}
  var stream = through(write, end)
  var headers = extend(HEADERS, {})
  var apiUrl = url.parse(opts.uri || CONNECT_URL)
  var parser = opts.parser || JSON.parse.bind(JSON)
  var protocol = apiUrl.protocol === 'https:' ? https : http
  var ended = false

  var filter = null
  var request = null
  var currentOffset = null

  return stream

  function startRequest () {
    var connectFilter = extend(filter, {})

    if (currentOffset) {
      connectFilter.resume_offset = currentOffset
    }

    stream.emit('connect')

    request = protocol.request(extend(apiUrl, {
      method: 'POST',
      headers: extend(headers, createConnectHeaders(connectFilter))
    }), gotResponse)

    request.on('error', emitError)

    request.write(JSON.stringify(connectFilter))
  }

  function createConnectHeaders (body) {
    return {
      'Content-Length': JSON.stringify(body).length,
      'X-UA-Appkey': appKey,
      'Authorization': 'Bearer ' + accessToken
    }
  }

  function checkReconnect () {
    if (!ended) {
      startRequest()
    }
  }

  function gotResponse (response) {
    if (response.statusCode === 307 && response.headers['set-cookie']) {
      stream.emit('redirect')
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

    response
      .pipe(zlib.createGunzip())
        .on('error', emitError)
      .pipe(split(parseJSON))
        .on('data', emitData)
        .on('end', checkReconnect)
  }

  function parseJSON (data) {
    if (!data) {
      return
    }

    try {
      return parser(data)
    } catch (err) {
      err.blob = data
      stream.emit('error', err)
    }
  }

  function emitData (data) {
    currentOffset = data.offset

    stream.push(data)
  }

  function write (data, _, next) {
    filter = data
    currentOffset = null

    if (request) {
      request.end()
    }

    startRequest()

    next()
  }

  function end (done) {
    ended = true

    if (request) {
      request.end()
      request.on('end', done)
    } else {
      done()
    }
  }

  function emitError (err) {
    stream.emit('error', err)
  }
}
