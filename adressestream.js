console.log('AdresseStream modul');

var util = require('util');
var Transform = require('stream').Transform;
util.inherits(AdresseStream, Transform);

function AdresseStream(options) {
  if (!(this instanceof AdresseStream))
    return new AdresseStream(options);

  Transform.call(this, {objectMode: true});
}

exports.AdresseStream = AdresseStream;

AdresseStream.prototype._transform = function(mongoadresse, encoding, done) {
  try {
    if (mongoadresse) {
      console.log('adresse chunk');
      this.push(buildAdresse(mongoadresse));
      done();
    }
    else {
      console.log('adresse slut');
      this.push(null);
      done();
    }
  }
  catch(err) {
    done(err);
  }
};

function buildAdresse(adresse) {  
  var nyadresse= {};
  nyadresse.id= adresse.id;
  nyadresse.vej= adresse.vej;
  nyadresse.husnr= adresse.husnr;
  nyadresse.etage= adresse.etage;
  nyadresse.dør= adresse.dør;
  nyadresse.bygningsnavn= adresse.bygningsnavn;
  nyadresse.supplerendebynavn= adresse.supplerendebynavn;
  nyadresse.postnummer= adresse.postnummer;
  nyadresse.kommune= {};
  nyadresse.kommune.kode= adresse.kommunekode;
  nyadresse.ejerlav= adresse.ejerlav;
  nyadresse.landsejerlav= adresse.landsejerlav;
  nyadresse.matrikelnr= adresse.matrikelnr;
  nyadresse.adgangsadresse= {};
  nyadresse.adgangsadresse.id= adresse.adgangsadresseid;
  nyadresse.adressepunkt= {};
  nyadresse.adressepunkt.etrs89koordinat= {};
  nyadresse.adressepunkt.etrs89koordinat.øst= adresse.adressepunkt.etrs89koordinat.coordinates[0];
  nyadresse.adressepunkt.etrs89koordinat.nord= adresse.adressepunkt.etrs89koordinat.coordinates[1];
  nyadresse.adressepunkt.wgs84koordinat= {};
  nyadresse.adressepunkt.wgs84koordinat.længde= adresse.adressepunkt.wgs84koordinat.coordinates[0];
  nyadresse.adressepunkt.wgs84koordinat.bredde= adresse.adressepunkt.wgs84koordinat.coordinates[1];
  nyadresse.adressepunkt.nøjagtighed= adresse.adressepunkt.nøjagtighed;
  nyadresse.adressepunkt.kilde= adresse.adressepunkt.kilde;
  nyadresse.adressepunkt.tekniskstandard= adresse.adressepunkt.tekniskstandard;
  nyadresse.adressepunkt.tekstretning= adresse.adressepunkt.tekstretning;
  nyadresse.adressepunkt.ændret= adresse.adressepunkt.ændret;
  nyadresse.historik= {};
  nyadresse.historik.oprettet= adresse.oprettet;
  nyadresse.historik.gyldig= adresse.gyldig;
  nyadresse.historik.ændret= adresse.ændret;  
  nyadresse.DDKN= adresse.DDKN;
  nyadresse.sogn= adresse.sogn;
  return nyadresse;
};