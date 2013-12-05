console.log('AdresseStream modul');

var util = require('util')
  , url = require("url");
var Transform = require('stream').Transform;
util.inherits(AdresseStream, Transform);

var urlparts= {};

function AdresseStream(options) {
  if (!(this instanceof AdresseStream))
    return new AdresseStream(options);

  urlparts.protocol= options.req.protocol;
  urlparts.host= options.req.headers.host;
  Transform.call(this, {objectMode: true});
}

exports.AdresseStream = AdresseStream;

AdresseStream.prototype._transform = function(mongoadresse, encoding, done) {
  try {
    if (mongoadresse) {
      this.push(buildAdresse(mongoadresse));
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

AdresseStream.prototype._flush = function (callback) {
  this.push(null);
  callback();
}

function buildAdresse(adresse) {  
  var nyadresse= {};
  nyadresse.id= adresse.id;
  urlparts.pathname= "/adresser/"+adresse.id;
  nyadresse.href= url.format(urlparts);
  nyadresse.vej= adresse.vej;
  nyadresse.husnr= adresse.husnr;
  nyadresse.etage= adresse.etage;
  nyadresse.dør= adresse.dør;
  nyadresse.bygningsnavn= adresse.bygningsnavn;
  nyadresse.supplerendebynavn= adresse.supplerendebynavn;
  nyadresse.postnummer= adresse.postnummer;
  if (adresse.postnummer) {
    urlparts.pathname= "/postnumre/"+adresse.postnummer.nr;
    nyadresse.postnummer.href= url.format(urlparts);
  }
  nyadresse.kommune= {};
  nyadresse.kommune.kode= adresse.kommunekode;
  urlparts.pathname= "/kommuner/"+adresse.kommunekode;
  nyadresse.kommune.href= url.format(urlparts);
  nyadresse.matrikel= {};
  nyadresse.matrikel.nr= adresse.landsejerlav; // fejl fra konvertering
  nyadresse.matrikel.ejerlav= adresse.ejerlav;
  nyadresse.matrikel.landsejerlav= adresse.matrikelnr; // fejl fra konvertering
  urlparts.pathname= "/matrikler/"+nyadresse.matrikel.ejerlav.nr+'/'+nyadresse.matrikel.nr
  nyadresse.matrikel.href= url.format(urlparts);
  nyadresse.adgangsadresse= {};
  nyadresse.adgangsadresse.id= adresse.adgangsadresseid;
  urlparts.pathname= "/adgangsadresser/"+adresse.adgangsadresseid;
  nyadresse.adgangsadresse.href= url.format(urlparts);
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
  // nyadresse.historik= {};
  // nyadresse.historik.oprettet= adresse.oprettet;
  // nyadresse.historik.gyldig= adresse.gyldig;
  // nyadresse.historik.ændret= adresse.ændret;  
  nyadresse.DDKN= adresse.DDKN;
  nyadresse.sogn= adresse.sogn;
  if (adresse.sogn) {
    urlparts.pathname= "/sogne/"+adresse.sogn.nr;
    nyadresse.sogn.href= url.format(urlparts);
  }
  return nyadresse;
};