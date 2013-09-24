console.log('MongoPostnummerStream modul');

var util = require('util');
var Readable = require('stream').Readable;
util.inherits(MongoPostnummerStream, Readable);

function MongoPostnummerStream(cursor, options) {
  if (!(this instanceof MongoPostnummerStream))
    return new MongoPostnummerStream(options);

  Readable.call(this, {objectMode: true});
  this.cursor = cursor;
  this.reading= false;
}

exports.MongoPostnummerStream = MongoPostnummerStream;

MongoPostnummerStream.prototype._read = function() {
  if (this.reading) return;
  var self= this;
  this.cursor.each(function(err, doc) { 
    self.reading= true;   
    if (err) {
      console.log('MongoPostnummerStream: nextObject error: '+err);
      return self.emit('error', err);
    }
    else if (doc) {
      self.push(doc);
    }
    else {
      self.push(null);
    }
  });
};
