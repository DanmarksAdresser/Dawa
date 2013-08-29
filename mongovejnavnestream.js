console.log('MongoVejnavneStream modul');

var util = require('util');
var Readable = require('stream').Readable;
util.inherits(MongoVejnavneStream, Readable);

function MongoVejnavneStream(cursor, options) {
  if (!(this instanceof MongoVejnavneStream))
    return new MongoVejnavneStream(options);

  Readable.call(this, {objectMode: true});
  this.cursor = cursor;
  this.reading= false;
}

exports.MongoVejnavneStream = MongoVejnavneStream;

MongoVejnavneStream.prototype._read = function() {
  if (this.reading) return;
  var self= this;
  this.cursor.each(function(err, doc) { 
    self.reading= true;   
    if (err) {
      console.log('MongoVejnavneStream: nextObject error: '+err);
      return self.emit('error', err);
    }
    else if (doc) {
      console.log('chunk');
      self.push(doc);
    }
    else {
      self.push(null);
    }
  });
};
