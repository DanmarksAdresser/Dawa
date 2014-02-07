
var util = require('util');
var Transform = require('stream').Transform;
util.inherits(VejnavnStream, Transform);

function VejnavnStream(options) {
  if (!(this instanceof VejnavnStream))
    return new VejnavnStream(options);

  Transform.call(this, {objectMode: true});
}

exports.VejnavnStream = VejnavnStream;

VejnavnStream.prototype._transform = function(mongovejnavn, encoding, done) {
  try {
    if (mongovejnavn) {
      var vejnavn= {};
      vejnavn.navn= mongovejnavn.navn;
      vejnavn.postnumre= mongovejnavn.postnumre;
      vejnavn.kommuner= mongovejnavn.kommuner;
      this.push(vejnavn);
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
