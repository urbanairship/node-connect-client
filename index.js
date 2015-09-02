var zlib = require('zlib')
var http = require('https')

var through = require('through2').obj
var extend = require('xtend')
var split = require('split')

var HEADERS = {
  'Accept': 'application/vnd.urbanairship+x-ndjson;version=3;',
  'Content-Type': 'application/json'
}

module.exports = eagleCreek

function eagleCreek (user, pass, opts) {
  var stream = through(write, end)
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

    request = http.request({
      hostname: 'connect.urbanairship.com',
      path: '/api/events/',
      method: 'POST',
      auth: user + ':' + pass,
      headers: extend(HEADERS, contentLength(connectFilter))
    }, gotResponse)

    request.on('error', emitError)

    request.write(JSON.stringify(connectFilter))
  }

  function contentLength (body) {
    return {'Content-length': JSON.stringify(body).length}
  }

  function checkReconnect () {
    if (!ended) {
      startRequest()
    }
  }

  function gotResponse (response) {
    response.pipe(zlib.createGunzip()).pipe(split()).on('data', emitData)
    response.on('end', checkReconnect)
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

  function write (data) {
    filter = data

    if (request) {
      request.end()
    } else {
      startRequest()
    }
  }

  function end () {
    ended = true

    if (request) {
      request.end()
    }
  }

  function emitError (err) {
    stream.emit('error', err)
  }
}
