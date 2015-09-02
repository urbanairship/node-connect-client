var stream = require('./')

var test = stream('ISex_TTJRuarzs9-o_Gkhg', 'cqEQS-QzSFW4TdssghiBLQ')

test.on('data', console.log.bind(console))
test.on('error', function (err) {
  console.log('error!', err)
})
test.write({start: 'LATEST'})
