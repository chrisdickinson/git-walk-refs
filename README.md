# git-walk-refs

given a function to lookup hashes, a list of hashes
to walk, and an optional hash to stop at, return
a readable stream of git commits in (largely) reverse
chronological order.

```javascript
var load = require('git-fs-repo')
  , walk = require('git-walk-refs')
  , fs = require('fs')

load(fs, function(err, git) {
  var hashes = git.refs().map(function(ref) {
    return ref.hash
  })

  walk(git.find.bind(git), hashes)
    .on('data', console.log)
})

```

## API

#### walk(find function(hash, ready), hash array[, untilhash]) -> walk-stream

create a readable/writable stream of git commits.

#### walk-stream.write(hash)

mark a hash as "seen" arbitrarily. this is useful for the git smart
pack protocol.

## License

MIT
