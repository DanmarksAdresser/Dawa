"use strict";

var _ = require('underscore');

var databaseTypes = require('../psql/databaseTypes');
var logger = require('../logger').forCategory('darImport');
var types = require('./csvTypes');

var Husnr = databaseTypes.Husnr;
var Range = databaseTypes.Range;
var GeometryPoint2d = databaseTypes.GeometryPoint2d;


var csvHusnrRegex = /^(\d*)([A-ZÆØÅ]?)$/;

function removePrefixZeroes(str) {
  while (str && str.charAt(0) === '0') {
    str = str.substring(1);
  }
  return str;
}

function parseHusnr(str) {
  if(!str) {
    return null;
  }
  str = str.trim();
  if(str === '') {
    return null;
  }
  var match = csvHusnrRegex.exec(str);
  if(!match) {
    logger.error('Unable to parse husnr: ' + str);
    return null;
  }
  var tal;
  if(match[1] !== '') {
    tal = parseInt(match[1], 10);
  }
  else {
    tal = 0;
  }
  var bogstav = match[2] ? match[2] : null;
  return new Husnr(tal, bogstav);

}

function transformInterval(val) {

  var lower = parseHusnr(val.byhusnummerfra);
  delete val.byhusnummerfra;
  var upper = parseHusnr(val.byhusnummertil);
  delete val.byhusnummertil;
  val.husnrinterval = new Range(lower, upper, '[]');
  if(Husnr.lessThan(upper, lower)) {
    logger.error("Invalid husnr interval: " + val.husnrinterval.toPostgres());
    val.husnrinterval = new Range(null, null, 'empty');
  }
  return val;
}

function transformHusnummer(obj) {
  obj.husnummer = parseHusnr(obj.husnummer);
  return obj;
}

function transformPostnr(val) {
  val = transformInterval(val);
  val.side = val.vejstykkeside;
  delete val.vejstykkeside;
  return val;
}

function transformSupplerendebynavn(val) {
  val = transformInterval(val);
  if(!val) {
    return;
  }
  val.side = val.byvejside;
  delete val.byvejside;
  return val;
}


var adgangspunktCsvColumns = [
  {
    name: 'id',
    type: types.integer
  },
  {
    name: 'bkid',
    type: types.uuid
  },
  {
    name: 'statuskode',
    type: types.integer
  },
  {
    name: 'kildekode',
    type: types.integer
  },
  {
    name: 'nord',
    type: types.float
  },
  {
    name: 'oest',
    type: types.float
  },
  {
    name: 'tekniskstandard',
    type: types.string
  },
  {
    name: 'noejagtighedsklasse',
    type: types.string
  },
  {
    name: 'retning',
    type: types.float
  },
  {
    name: 'placering',
    type: types.integer
  },
  {
    name: 'kommunenummer',
    type: types.integer
  },
  {
    name: 'esdhreference',
    type: types.string
  },
  {
    name: 'journalnummer',
    type: types.string
  },
  {
    name: 'revisionsdato',
    type: types.timestamp
  }];

var husnummerCsvColumns = [
  {
    name: 'id',
    type: types.integer
  },
  {
    name: 'bkid',
    type: types.uuid
  },
  {
    name: 'statuskode',
    type: types.integer
  },
  {
    name: 'kildekode',
    type: types.integer
  },
  {
    name: 'adgangspunktid',
    type: types.integer
  },
  {
    name: 'vejkode',
    type: types.integer
  },
  {
    name: 'husnummer',
    type: types.string
  },
  {
    name: 'ikrafttraedelsesdato',
    type: types.timestamp
  },
  {
    name: 'vejnavn',
    type: types.string
  },
  {
    name: 'postnummer',
    type: types.integer
  },
  {
    name: 'postdistrikt',
    type: types.string
  },
  {
    name: 'bynavn',
    type: types.string
  }
];

var adresseCsvColumns = [
  {
    name: 'id',
    type: types.integer
  },
  {
    name: 'bkid',
    type: types.uuid
  },
  {
    name: 'statuskode',
    type: types.integer
  },
  {
    name: 'kildekode',
    type: types.integer
  },
  {
    name: 'husnummerid',
    type: types.integer
  },
  {
    name: 'etagebetegnelse',
    type: types.string
  },
  {
    name: 'doerbetegnelse',
    type: types.string
  },
  {
    name: 'esdhreference',
    type: types.string
  },
  {
    name: 'journalnummer',
    type: types.string
  },
  {
    name: 'ikrafttraedelsesdato',
    type: types.timestamp
  }];

var streetnameColumns = [
  {
    name: 'id',
    type: types.uuid
  },
  {
    name: 'kommunekode',
    type: types.integer
  },
  {
    name: 'vejkode',
    type: types.integer
  },
  {
    name: 'navn',
    type: types.string
  },
  {
    name: 'adresseringsnavn',
    type: types.string
  },
  {
    name: 'aendringstimestamp',
    type: types.timestamp
  },
  {
    name: 'oprettimestamp',
    type: types.timestamp
  },
  {
    name: 'ophoerttimestamp',
    type: types.timestamp
  }
];

var postnrColumns = [
  {
    name: 'id',
    type: types.uuid
  },
  {
    name: 'kommunekode',
    type: types.integer
  },
  {
    name: 'vejkode',
    type: types.integer
  },
  {
    name: 'byhusnummerfra',
    type: types.string
  },
  {
    name: 'byhusnummertil',
    type: types.string
  },
  {
    name: 'vejstykkeside',
    type: types.string
  },
  {
    name: 'postdistriktnummer',
    type: types.integer
  },
  {
    name: 'aendringstimestamp',
    type: types.timestamp
  },
  {
    name: 'oprettimestamp',
    type: types.timestamp
  },
  {
    name: 'ophoerttimestamp',
    type: types.timestamp
  }
];

var supplerendebynavnColumns = [
  {
    name: 'id',
    type: types.uuid
  },
  {
    name: 'kommunekode',
    type: types.integer
  },
  {
    name: 'vejkode',
    type: types.integer
  },
  {
    name: 'byhusnummerfra',
    type: types.string
  },
  {
    name: 'byhusnummertil',
    type: types.string
  },
  {
    name: 'byvejside',
    type: types.string
  },
  {
    name: 'bynavn',
    type: types.string
  },
  {
    name: 'aendringstimestamp',
    type: types.timestamp
  },
  {
    name: 'oprettimestamp',
    type: types.timestamp
  },
  {
    name: 'ophoerttimestamp',
    type: types.timestamp
  }
];

var csvSpec = {
  adgangspunkt: {
    bitemporal: true,
    filename: 'Adgangspunkt.csv',
    columns: adgangspunktCsvColumns,
    transform: function(val) {
      var oest = val.oest;
      delete val.oest;
      var nord = val.nord;
      delete val.nord;
      var srid = 25832;
      if(!oest || !nord) {
        val.geom = null;
      }
      else {
        val.geom = new GeometryPoint2d(oest, nord, srid);
      }
      return val;
    }
  },
  husnummer: {
    bitemporal: true,
    filename: 'Husnummer.csv',
    columns: husnummerCsvColumns,
    transform: transformHusnummer
  },
  adresse: {
    bitemporal: true,
    filename: 'Adresse.csv',
    columns: adresseCsvColumns,
    transform: function(row) {
      if(!_.isUndefined(row.etagebetegnelse) && !_.isNull(row.etagebetegnelse)) {
        row.etagebetegnelse = removePrefixZeroes(row.etagebetegnelse);
        row.etagebetegnelse = row.etagebetegnelse.toLowerCase();
      }
      if(!_.isUndefined(row.doerbetegnelse) && !_.isNull(row.doerbetegnelse)) {
        row.doerbetegnelse = row.doerbetegnelse.toLowerCase();
      }
      return row;
    }
  },
  streetname: {
    bitemporal: false,
    filename: 'Vejnavn.csv',
    columns: streetnameColumns,
    transform: function(row) {
      if(row.navn) {
        row.navn = row.navn.trim();
      }
      if(row.adresseringsnavn) {
        row.adresseringsnavn = row.adresseringsnavn.trim();
      }
      return row;
    }
  },
  postnr: {
    bitemporal: false,
    filename: 'Vejstykke.csv',
    columns: postnrColumns,
    transform: transformPostnr
  },
  supplerendebynavn: {
    bitemporal: false,
    filename: 'SupplerendeBynavn.csv',
    columns: supplerendebynavnColumns,
    transform: transformSupplerendebynavn
  }
};

module.exports = csvSpec;