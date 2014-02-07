
var util = require('util')
,   Transform = require('stream').Transform;
util.inherits(CsvAdresseStream, Transform);

function CsvAdresseStream(response) {
  Transform.call(this, { objectMode: true});
  this.response= response;
  this.first= true;
}

exports.CsvAdresseStream = CsvAdresseStream;

CsvAdresseStream.prototype._transform = function(adresse, encoding, done) {
  //console.log("CSV encoding: "+encoding);
  try {
    if (this.first) { 
      this.first= false;     
      this.response.charset= 'UTF-8';    
      this.response.type('text/csv');
      var buffer= new Buffer(buildOverskriftCsv());
      this.push(buffer);
    }
    if (adresse) {
      //console.log('csv adresse');
      var buffer= new Buffer(buildAdresseCsv(adresse));
      this.push(buffer);
      done();
    }
  }
  catch(err) {
    done(err);
  }
};

function buildOverskriftCsv() {
  return "\ufeff" +  // bom
    "id;"+
    "vejkode;"+
    "vejnavn;"+
    "husnr;"+
    "etage;"+
    "dør;"+
    "bygningsnavn;"+
    "supplerendebynavn;"+
    "postnummer;"+
    "postnummernavn;"+
    "kommunekode;"+
    "ejerlav nr;"+
    "ejerlav navn;"+
    "landsejerlav;"+
    "matrikelnr;"+
    "adgangsadresseid;"+
    "etrs89koordinatøst;"+
    "etrs89koordinatnord;"+
    "wgs84koordinatlængde;"+
    "wgs84koordinatbredde;"+
    "nøjagtighed;"+
    "kilde;"+
    "tekniskstandard;"+
    "tekstretning;"+
    "adressepunkt ændret;"+
    "oprettet;"+
    "gyldig;"+
    "ændret;"+
    "KN100mDK;"+
    "KN1kmDK;"+
    "KN10kmDK;"+
    "sognnr;"+
    "sognnavn"+
    "\r\n";
};

function buildAdresseCsv(adresse) {
  return util.format("%s;%s;%s;%s;%s;%s;%s;%s;%s;%s;%s;%s;%s;%s;%s;%s;%s;%s;%s;%s;%s;%s;%s;%s;%s;%s;%s;%s;%s;%s;%s;%s;%s\r\n",
    encodeField(adresse.id),
    encodeField(adresse.vej.kode),
    encodeField(adresse.vej.navn),
    encodeField(adresse.husnr),
    encodeField(adresse.etage),
    encodeField(adresse.dør),
    encodeField(adresse.bygningsnavn),
    encodeField(adresse.supplerendebynavn),
    encodeField(adresse.postnummer.nr),
    encodeField(adresse.postnummer.navn),
    encodeField(adresse.kommunekode),
    encodeField(adresse.ejerlav.nr),
    encodeField(adresse.ejerlav.navn),
    encodeField(adresse.landsejerlav),
    encodeField(adresse.matrikelnr),
    encodeField(adresse.adgangsadresseid),
    encodeField(adresse.adressepunkt.etrs89koordinat.coordinates[0]),
    encodeField(adresse.adressepunkt.etrs89koordinat.coordinates[1]),
    encodeField(adresse.adressepunkt.wgs84koordinat.coordinates[0]),
    encodeField(adresse.adressepunkt.wgs84koordinat.coordinates[1]), 
    encodeField(adresse.adressepunkt.nøjagtighed),
    encodeField(adresse.adressepunkt.kilde),
    encodeField(adresse.adressepunkt.tekniskstandard),
    encodeField(adresse.adressepunkt.tekstretning),
    encodeField(adresse.adressepunkt.ændret),
    encodeField(adresse.oprettet),
    encodeField(adresse.gyldig),
    encodeField(adresse.ændret),
    encodeField(adresse.DDKN.m100),
    encodeField(adresse.DDKN.km1),
    encodeField(adresse.DDKN.km10),
    adresse.sogn?encodeField(adresse.sogn.nr):"",
    adresse.sogn?encodeField(adresse.sogn.navn):""
  );
};

function encodeField(field) {
  if (field === undefined) return "";
  field= field.toString().replace('"','""','gi');
  return '"' + field + '"';
}
