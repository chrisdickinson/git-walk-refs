module.exports = spider

var through = require('through')
  , human = require('git-parse-human')

function spider(findhash, hashes, untilhash) {
  var stream = through(write, end)
    , ended = false
    , seen = {}

  process.nextTick(step)

  return stream

  function write(hash) {
    seen[hash] = true
  }

  function end() {
    ended = true
    stream.queue(null)
  }

  function step() {
    var expecting = hashes.length
      , output = []

    for(var i = 0, len = hashes.length; i < len; ++i) {
      grab(hashes[i], i)
    }

    function grab(hash, idx) {
      findhash(hash, function(err, data) {
        if(err) {
          return error(err)
        }
        
        if(ended) {
          return
        }

        output[idx] = data
        !--expecting && done()
      })
    }

    function done() {
      if(ended) {
        return
      }

      if(stream.paused) {
        stream.once('drain', function() {
          done()
        })
      }

      if(!output.length) {
        stream.queue(null)
        return
      }

      var max_idx = 0
        , max = -Infinity
        , _human

      for(var i = 0, len = output.length; i < len; ++i) {
        _human = output[i].human = human(output[i].author() || output[i].committer())
        if(_human && _human.time > max) {
          max = _human.time
          max_idx = i
        }
      }

      var maximum = output[max_idx]
        , parents = maximum.parents()

      if(seen[maximum.hash]) {
        output.splice(max_idx, 1)
        return done()
      }
      seen[maximum.hash] = true
      maximum.band = max_idx
      stream.queue(maximum)

      // see if maximum is the parent
      // of any other commit, and if so, prune
      // that commit
      for(var i = 0, len = output.length; i < len; ++i) {
        var cur_pars = output[i]._cur_pars =
              output[i]._cur_pars || output[i].parents()
          , idx = cur_pars.indexOf(maximum.hash)

        if(idx > -1) {
          cur_pars.splice(idx, 1)
          if(!cur_pars.length) {
            output.splice(i, 1)
            i -= 1
            len -= 1
          }
        }
      }

      // if there's no more parents, recurse the others or exit
      if(!parents.length) {
        output.splice(max_idx, 1)
        if(!output.length) {
          ended = true
          return stream.queue(null)
        }
        max = -Infinity
        return done()
      }

      // grab the parents of the current maximum.
      expecting = parents.length
      output.splice.apply(expecting, [max_idx, 1].concat(parents))

      for(var i = 0, len = parents.length; i < len; ++i) {
        grab(parents[i], i + max_idx)
      } 
    }
  }

  function error(err) {
    ended = true
    stream.emit('error', err)
  }
}
