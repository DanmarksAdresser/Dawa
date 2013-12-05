console.log('AdresseGeoJSONStream modul');

var util = require('util')
  , url = require("url");
var Transform = require('stream').Transform;
util.inherits(AdresseGeoJSONStream, Transform);

var urlparts= {};

function AdresseGeoJSONStream(options) {
  if (!(this instanceof AdresseGeoJSONStream))
    return new AdresseGeoJSONStream(options);

  urlparts.protocol= options.req.protocol;
  urlparts.host= options.req.headers.host;
  Transform.call(this, {objectMode: true});
}

exports.AdresseGeoJSONStream = AdresseGeoJSONStream;

AdresseGeoJSONStream.prototype._transform = function(mongoadresse, encoding, done) {
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

AdresseGeoJSONStream.prototype._flush = function (callback) {
  this.push(null);
  callback();
}

function buildAdresse(adresse) {  
  var geojsonadresse= {};
  geojsonadresse.type= "Feature";
  // geojsonadresse.crs= {
  //   "type": "name",
  //   "properties": {"name": "EPSG:25832"}
  // };
  geojsonadresse.geometry= {};
  geojsonadresse.geometry.type= "Point";
  //geojsonadresse.geometry.coordinates= [adresse.adressepunkt.wgs84koordinat.coordinates[0],adresse.adressepunkt.wgs84koordinat.coordinates[1]];
  geojsonadresse.geometry.coordinates= [adresse.adressepunkt.etrs89koordinat.coordinates[1],adresse.adressepunkt.etrs89koordinat.coordinates[0]];
  geojsonadresse.properties= {};
  geojsonadresse.properties.vej= adresse.vej.navn;
  geojsonadresse.properties.husnr= adresse.husnr;
  geojsonadresse.properties.etage= adresse.etage;
  geojsonadresse.properties.dør= adresse.dør;
  geojsonadresse.properties.postnr= adresse.postnummer.nr;
  geojsonadresse.properties.postnrnavn= adresse.postnummer.navn;
  // geojsonadresse.id= adresse.id;
  // urlparts.pathname= "/adresser/"+adresse.id;
  // geojsonadresse.href= url.format(urlparts);
  // geojsonadresse.vej= adresse.vej;
  // geojsonadresse.husnr= adresse.husnr;
  // geojsonadresse.etage= adresse.etage;
  // geojsonadresse.dør= adresse.dør;
  // geojsonadresse.bygningsnavn= adresse.bygningsnavn;
  // geojsonadresse.supplerendebynavn= adresse.supplerendebynavn;
  // geojsonadresse.postnummer= adresse.postnummer;
  // if (adresse.postnummer) {
  //   urlparts.pathname= "/postnumre/"+adresse.postnummer.nr;
  //   geojsonadresse.postnummer.href= url.format(urlparts);
  // }
  // geojsonadresse.kommune= {};
  // geojsonadresse.kommune.kode= adresse.kommunekode;
  // urlparts.pathname= "/kommuner/"+adresse.kommunekode;
  // geojsonadresse.kommune.href= url.format(urlparts);
  // geojsonadresse.matrikel= {};
  // geojsonadresse.matrikel.nr= adresse.landsejerlav; // fejl fra konvertering
  // geojsonadresse.matrikel.ejerlav= adresse.ejerlav;
  // geojsonadresse.matrikel.landsejerlav= adresse.matrikelnr; // fejl fra konvertering
  // urlparts.pathname= "/matrikler/"+geojsonadresse.matrikel.ejerlav.nr+'/'+geojsonadresse.matrikel.nr
  // geojsonadresse.matrikel.href= url.format(urlparts);
  // geojsonadresse.adgangsadresse= {};
  // geojsonadresse.adgangsadresse.id= adresse.adgangsadresseid;
  // urlparts.pathname= "/adgangsadresser/"+adresse.adgangsadresseid;
  // geojsonadresse.adgangsadresse.href= url.format(urlparts);
  // geojsonadresse.adressepunkt= {};
  // geojsonadresse.adressepunkt.etrs89koordinat= {};
  // geojsonadresse.adressepunkt.etrs89koordinat.øst= adresse.adressepunkt.etrs89koordinat.coordinates[0];
  // geojsonadresse.adressepunkt.etrs89koordinat.nord= adresse.adressepunkt.etrs89koordinat.coordinates[1];
  // geojsonadresse.adressepunkt.wgs84koordinat= {};
  // geojsonadresse.adressepunkt.wgs84koordinat.længde= adresse.adressepunkt.wgs84koordinat.coordinates[0];
  // geojsonadresse.adressepunkt.wgs84koordinat.bredde= adresse.adressepunkt.wgs84koordinat.coordinates[1];
  // geojsonadresse.adressepunkt.nøjagtighed= adresse.adressepunkt.nøjagtighed;
  // geojsonadresse.adressepunkt.kilde= adresse.adressepunkt.kilde;
  // geojsonadresse.adressepunkt.tekniskstandard= adresse.adressepunkt.tekniskstandard;
  // geojsonadresse.adressepunkt.tekstretning= adresse.adressepunkt.tekstretning;
  // geojsonadresse.adressepunkt.ændret= adresse.adressepunkt.ændret;
  // // geojsonadresse.historik= {};
  // // geojsonadresse.historik.oprettet= adresse.oprettet;
  // // geojsonadresse.historik.gyldig= adresse.gyldig;
  // // geojsonadresse.historik.ændret= adresse.ændret;  
  // geojsonadresse.DDKN= adresse.DDKN;
  // geojsonadresse.sogn= adresse.sogn;
  // if (adresse.sogn) {
  //   urlparts.pathname= "/sogne/"+adresse.sogn.nr;
  //   geojsonadresse.sogn.href= url.format(urlparts);
  // }
  return geojsonadresse;
};