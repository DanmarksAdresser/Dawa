console.log('Vejnavn2AdresseStream modul');

var util = require('util')
  , Transform = require('stream').Transform
  , Adresse= require("./adresse");
util.inherits(Vejnavn2AdresseStream, Transform);

function Vejnavn2AdresseStream(options) {
  if (!(this instanceof Vejnavn2AdresseStream))
    return new Vejnavn2AdresseStream(options);

  Transform.call(this, {objectMode: true});
}

exports.Vejnavn2AdresseStream = Vejnavn2AdresseStream;

Vejnavn2AdresseStream.prototype._transform = function(mongovejnavn, encoding, done) {
  try {
    if (mongovejnavn) {
      console.log('vejnavn chunk');
      var adresse= Adresse.create();
      adresse.vej.navn= mongovejnavn.navn;
      this.push(adresse);
      done();
    }
    else {
      console.log('vejnavn slut');
      this.push(null);
      done();
    }
  }
  catch(err) {
    done(err);
  }
};
