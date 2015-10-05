# urban-airship-connect

A node library for Urban Airship's Connect

## Example Usage

```javascript
var connect = require('urban-airship-connect')

var connectStream = connect('appKey', 'authToken')

connectStream.on('data', function (data) {
  // will be called with each event
})

// write to the stream to set filters/offset/start
connectStream.write({start: 'EARLIEST'})
```

## API

`connect(appKey, authToken[, options]) -> duplexStream`

* `appKey` is your Urban Airship app key
* `authToken` is your Connect auth token
* `options` is an optional object accepting parameters:
  - `uri` to specify the URI to a running Connect instance

The returned duplex stream reads and writes plain JavaScript objects. Writes
are posted to Connect, and the responding events are emitted as plain JavaScript
objects over time.

## Notes

If an error is encountered during a request, a bad status code is encountered,
or JSON parsing of an event fails, an `'error'` event will be emitted with the
relevant information.

This module will handle connecting and maintaining a connection to Urban
Airship's Connect service. If its connection is ever severed, it will do its
best to resume at the last seen offset.

The `resume_offset` is not stored externally, so if the process using this
module is killed, crashes, or otherwise exits it will be lost. In general it is
advisable to track this offset yourself.

### Writing offset to disk

```javascript
var fs = require('fs')

var connect = require('urban-airship-connect')
var lookupStream = require('dotpath-stream')
var writeFile = require('file-replace-stream')

var connectStream = connect('appKey', 'authToken')
var filters = {}

// set up our pipeline for saving offsets
connectStream
  // pull out just the `offset` property
  .pipe(lookupStream('offset'))
  // write it to `last_offset.txt`
  .pipe(writeFile('last_offset.txt'))

try {
  // try to read our offset file
  filters.resume_offset = fs.readFileSync('last_offset.txt', {encoding: 'utf8'})
} catch (err) {
  // fall back to starting at earliest offset
  filters.start = 'EARLIEST'
}

// write the filters to Connect to start streaming events
connectStream.write(filters)
```

#### Notes

* `writeFile` could be swapped out for _any_ writable stream for persistence.
* If streams aren't your thing, you could alternatively listen to the `data`
  event of `connectStream` and persist the `offset` property from the passed
  event however you please.

## Command-line Interface

A simple command-line utility `ua-connect` is bundled along with this module. It
should be mostly used for testing your credentials or other aspects of your
Connect setup, not for anything "mission-critical".

### Usage

`ua-connect <app-key> <token> [options]`

Where options are:

* `--uri <uri>` Use a custom uri for Connect
* `--offset <offset>` Start at `<offset>`
* `--earliest` Start at earliest offset
* `--key <app-key>` Explicitly set app key
* `--token <token>` Explicitly set token

## License

Apache-2.0
