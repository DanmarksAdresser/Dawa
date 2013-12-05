var Stream = require('stream').Stream
  , through = require('through')


exports.stringify = function (options, formatted) {
  op = options.op;
  sep = options.sep;
  cl = options.cl;

  var stream
    , first = true
    , anyData = false
  stream = through(function (data) {
    anyData = true
    var json = JSON.stringify(data, null, formatted?2:null)
    if(first) { first = false ; stream.queue(op + json)}
    else stream.queue(sep + json)
  },
  function (data) {
    if(!anyData)
      stream.queue(op)
    stream.queue(cl)
    stream.queue(null)
  })

  return stream
}
