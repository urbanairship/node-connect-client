#!/usr/bin/env node

var stream = require('./')

//node test.js appKey accessToken
var test = stream(process.argv[2], process.argv[3])

test.on('data', console.log.bind(console))
test.on('error', function (err) {
  console.log('error!', err)
  test.end()
})
test.write({start: 'LATEST'})
