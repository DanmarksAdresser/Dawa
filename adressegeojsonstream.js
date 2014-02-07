
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
  //console.log(util.inspect(adresse))
  var geojsonadresse= {};
  geojsonadresse.type= "Feature";
  // geojsonadresse.crs= {
  //   "type": "name",
  //   "properties": {"name": "EPSG:25832"}
  // };
  geojsonadresse.geometry= {};
  geojsonadresse.geometry.type= "Point";
  //geojsonadresse.geometry.coordinates= [adresse.adressepunkt.wgs84koordinat.coordinates[0],adresse.adressepunkt.wgs84koordinat.coordinates[1]];
  geojsonadresse.geometry.coordinates= [adresse.adressepunkt.etrs89koordinat.nord,adresse.adressepunkt.etrs89koordinat.øst];
  geojsonadresse.properties= {};
  geojsonadresse.properties.id= adresse.id;
  geojsonadresse.properties.vejkode= adresse.vej.kode;
  geojsonadresse.properties.vejnavn= adresse.vej.navn;
  geojsonadresse.properties.husnr= adresse.husnr;
  geojsonadresse.properties.etage= adresse.etage;
  geojsonadresse.properties.dør= adresse.dør;
  // geojsonadresse.properties.bygningsnavn= adresse.bygningsnavn;
  geojsonadresse.properties.supplerendebynavn= adresse.supplerendebynavn;
  geojsonadresse.properties.postnr= adresse.postnummer.nr;
  geojsonadresse.properties.postnrnavn= adresse.postnummer.navn;
  geojsonadresse.properties.kommunekode= adresse.kommune.kode;
  geojsonadresse.properties.matrikelnr= adresse.matrikel.nr;
  geojsonadresse.properties.ejerlavsnr= adresse.matrikel.ejerlav.nr;
  geojsonadresse.properties.ejerlavsnavn= adresse.matrikel.ejerlav.navn;
  geojsonadresse.properties.landsejerlav= adresse.matrikel.landsejerlav;
  if (adresse.sogn) {
    geojsonadresse.properties.sognnr = adresse.sogn.nr;
    geojsonadresse.properties.sognnavn = adresse.sogn.navn;
  }
  geojsonadresse.properties.DDKNm100 = adresse.DDKN.m100;
  geojsonadresse.properties.DDKNkm1 = adresse.DDKN.km1;
  geojsonadresse.properties.DDKNkm10 = adresse.DDKN.km10;
  return geojsonadresse;
};
