"use strict";

var assert = require('chai').assert;
var _ = require('underscore');

var databaseTypes = require('../psql/databaseTypes');
var logger = require('../logger').forCategory('darImport');

var Husnr = databaseTypes.Husnr;
var Range = databaseTypes.Range;
var GeometryPoint2d = databaseTypes.GeometryPoint2d;


var csvHusnrRegex = /^(\d*)([A-Z]?)$/;

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

var types = {
  uuid: {
    parse: _.identity
  },
  timestamp: {
    parse: function(str) {
      var millis = Date.parse(str);
      assert.isNumber(millis, "Date " + str + " could be parsed");
      return new Date(millis).toISOString();
    }
  },
  string: {
    parse: function(str) {
      if(!str) {
        return null;
      }
      return str.trim();
    }
  },
  integer: {
    parse: function(str) {
      return parseInt(str, 10);
    }
  },
  float: {
    parse: function(str) {
      return parseFloat(str);
    }
  }
};

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

function transformCsv(spec, csvRow) {
  function parseStr(type, str) {
    if(str === undefined || str === null) {
      return null;
    }
    str = str.trim();
    if(str === '') {
      return null;
    }
    return type.parse(str);
  }
  var columns = spec.columns;
  if(spec.bitemporal) {
    columns = columns.concat(BITEMPORAL_CSV_COLUMNS);
  }
  return columns.reduce(function(memo, colSpec) {
    var str = csvRow[colSpec.name];
    memo[colSpec.name] = parseStr(colSpec.type, str);
    return memo;
  }, {});
}

function transform(spec, entity) {
  function toTimeInterval(name) {
    var from = entity[name + 'start'];
    delete entity[name + 'start'];
    var to = entity[name + 'slut'];
    delete entity[name + 'slut'];
    if(!from) {
      from = null;
    }
    if(!to) {
      to = null;
    }
    entity[name] = new Range(from, to, '[)');
  }
  if(spec.bitemporal) {
    toTimeInterval('registrering');
    toTimeInterval('virkning');
  }
  if(spec.transform) {
    entity = spec.transform(entity);
    if(!entity) {
      return;
    }
  }
  Object.keys(entity).forEach(function(key) {
    if(entity[key] && entity[key].toPostgres) {
      entity[key] = entity[key].toPostgres();
    }
  });
  return entity;
}

var BITEMPORAL_CSV_COLUMNS = [
  {
    name: 'versionid',
    type: types.integer
  },
  {
    name: 'registreringstart',
    type: types.timestamp
  },
  {
    name: 'registreringslut',
    type: types.timestamp
  },
  {
    name: 'virkningstart',
    type: types.timestamp
  },
  {
    name: 'virkningslut',
    type: types.timestamp
  }
];

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
    filename: 'Adgangspunkt.csv',
    table: 'dar_adgangspunkt',
    bitemporal: true,
    idColumns: ['id'],
    columns: adgangspunktCsvColumns,
    dbColumns: _.without(_.pluck(adgangspunktCsvColumns, 'name'), 'oest', 'nord').concat('geom'),
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
    filename: 'Husnummer.csv',
    table: 'dar_husnummer',
    bitemporal: true,
    idColumns: ['id'],
    columns: husnummerCsvColumns,
    dbColumns: _.pluck(husnummerCsvColumns, 'name'),
    transform: transformHusnummer
  },
  adresse: {
    filename: 'Adresse.csv',
    table: 'dar_adresse',
    bitemporal: true,
    idColumns: ['id'],
    columns: adresseCsvColumns,
    dbColumns: _.pluck(adresseCsvColumns, 'name'),
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
    filename: 'Vejnavn.csv',
    table: 'dar_vejnavn',
    bitemporal: false,
    idColumns: ['id'],
    columns: streetnameColumns,
    dbColumns: _.pluck(streetnameColumns, 'name'),
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
    filename: 'Vejstykke.csv',
    table: 'dar_postnr',
    bitemporal: false,
    idColumns: ['id'],
    columns: postnrColumns,
    dbColumns: _.without(_.pluck(postnrColumns, 'name'), 'byhusnummerfra', 'byhusnummertil', 'vejstykkeside').concat(['husnrinterval', 'side']),
    transform: transformPostnr
  },
  supplerendebynavn: {
    filename: 'SupplerendeBynavn.csv',
    table: 'dar_supplerendebynavn',
    bitemporal: false,
    idColumns: ['id'],
    columns: supplerendebynavnColumns,
    dbColumns: _.without(_.pluck(supplerendebynavnColumns, 'name'), 'byhusnummerfra', 'byhusnummertil', 'byvejside').concat(['husnrinterval', 'side']),
    transform: transformSupplerendebynavn
  }
};

exports.types = types;
exports.spec = csvSpec;
exports.transformCsv = transformCsv;
exports.transform = transform;