console.log('MongoAdresseStream modul');

var util = require('util');
var Readable = require('stream').Readable;
util.inherits(MongoAdresseStream, Readable);

function MongoAdresseStream(cursor, options) {
  if (!(this instanceof MongoAdresseStream))
    return new MongoAdresseStream(options);

  Readable.call(this, {objectMode: true});
  this.cursor = cursor;
  this.reading= false;
}

exports.MongoAdresseStream = MongoAdresseStream;

MongoAdresseStream.prototype._read = function() {
  if (this.reading) return;
  var self= this;
  this.cursor.each(function(err, doc) { 
    self.reading= true;   
    if (err) {
      console.log('MongoAdresseStream: nextObject error: '+err);
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
