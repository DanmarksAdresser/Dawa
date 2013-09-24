console.log('PostnummerStream modul');

var util = require('util');
var Transform = require('stream').Transform;
util.inherits(PostnummerStream, Transform);

function PostnummerStream(options) {
  if (!(this instanceof PostnummerStream))
    return new PostnummerStream(options);

  Transform.call(this, {objectMode: true});
}

exports.PostnummerStream = PostnummerStream;

PostnummerStream.prototype._transform = function(mongopostnummer, encoding, done) {
  try {
    if (mongopostnummer) {
      var postnummer= {};
      postnummer.postnr= mongopostnummer.postnr;
      postnummer.navn= mongopostnummer.navn;
      this.push(postnummer);
      done();
    }
    else {
      this.push(null);
      done();
    }
  }
  catch(err) {
    done(err);
  }
};