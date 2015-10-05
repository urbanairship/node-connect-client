#!/usr/bin/env node

var path = require('path')
var fs = require('fs')

var args = require('minimist')

var connect = require('../')
var pkg = require('../package.json')

module.exports = bin

if (require.main === module) {
  bin()
}

function bin () {
  var options = args(process.argv.slice(2))
  var streamOptions = {}
  var stream

  if (options.help) {
    return help()
  }

  if (options.version) {
    return version()
  }

  if (!options.key) {
    if (options._.length) {
      options.key = options._[0]
    } else {
      return help()
    }
  }

  if (!options.token) {
    if (options._.length > 1) {
      options.token = options._[1]
    } else {
      return help()
    }
  }

  if (options.uri) {
    streamOptions.uri = options.uri
  }

  stream = connect(options.key, options.token, streamOptions)

  stream.on('data', console.log.bind(console))

  if (options.offset) {
    stream.write({resume_offset: options.offset})
  } else if (options.earliest) {
    stream.write({start: 'EARLIEST'})
  } else {
    stream.write({start: 'LATEST'})
  }
}

function help () {
  version()

  fs.createReadStream(path.resolve(__dirname, '..', 'help.txt'))
    .pipe(process.stderr)
}

function version () {
  console.error('Connect client version ' + pkg.version)
}
