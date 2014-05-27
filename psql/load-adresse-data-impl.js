"use strict";

var async = require('async');
var csv = require('csv');
var copyFrom = require('pg-copy-streams').from;
var fs = require('fs');
var zlib = require('zlib');
var _ = require('underscore');

var sqlCommon = require('./common');
var bbrTransformers = require('../bbr/common/bbrTransformers');
var datamodels = require('../crud/datamodel');

function loadCsv(client, inputStream, options, callback) {
  var sql = "COPY " + options.tableName + "(" + options.columns.join(',') + ") FROM STDIN WITH (ENCODING 'utf8',HEADER TRUE, FORMAT csv, DELIMITER ';', QUOTE '\"')";
  console.log("executing sql %s", sql);
  var pgStream = client.query(copyFrom(sql));

  csv().from.stream(inputStream, {
    delimiter: ';',
    quote: '"',
    escape: '\\',
    columns: true,
    encoding: 'utf8'
  }).transform(options.transformer).to(pgStream, {
      delimiter: ';',
      quote: '"',
      escape: '\\',
      columns: options.columns,
      header: true,
      encoding: 'utf8'
    }).on('error', function (error) {
      callback(error);
    });


  pgStream.on('end', callback);
}

var legacyTransformers = {
  vejstykke: function(row, idx) {
    if(idx % 1000 === 0) {
      console.log(idx);
    }
    return {
      kode : row.StreetCode,
      kommunekode: row.MunicipalityCode,
      vejnavn : row.StreetName,
      adresseringsnavn: null
    };
  },
  adresse: function(row, idx) {
    if(idx % 1000 === 0) {
      console.log(idx);
    }
    return {
      id : row.AddressSpecificIdentifier,
      adgangsadresseid : row.AddressAccessReference,
      oprettet : row.AddressSpecificCreateDate,
      aendret : row.AddressSpecificChangeDate,
      etage : row.FloorIdentifier,
      doer : row.SuiteIdentifier
    };
  },
  adgangsadresse: function(row, idx) {
    if(idx % 1000 === 0) {
      console.log(idx);
    }
    return {
      id: row.AddressAccessIdentifier,
      vejkode: row.StreetCode,
      kommunekode: row.MunicipalityCode,
      husnr: row.StreetBuildingIdentifier,
      supplerendebynavn: row.DistrictSubdivisionIdentifier,
      postnr: row.PostCodeIdentifier,
      ejerlavkode: row.CadastralDistrictIdentifier,
      ejerlavnavn: row.CadastralDistrictName,
      matrikelnr: row.LandParcelIdentifier,
      esrejendomsnr: row.MunicipalRealPropertyIdentifier,
      oprettet: row.AddressAccessCreateDate,
      ikraftfra: row.AddressAccessValidDate,
      aendret: row.AddressAccessChangeDate,
      etrs89oest: row.ETRS89utm32Easting,
      etrs89nord: row.ETRS89utm32Northing,
      wgs84lat: row.WGS84GeographicLatitude,
      wgs84long: row.WGS84GeographicLongitude,
      noejagtighed: row.AddressCoordinateQualityClassCode,
      kilde: row.AddressGeometrySourceCode,
      tekniskstandard: row.AddressCoordinateTechnicalStandardCode,
      tekstretning: row.AddressTextAngleMeasure,
      kn100mdk: row.GeometryDDKNcell100mText,
      kn1kmdk: row.GeometryDDKNcell1kmText,
      kn10kmdk: row.GeometryDDKNcell10kmText,
      adressepunktaendringsdato: row.AddressPointRevisionDateTime
    };
  }
};

var bbrFileNames = {
  vejstykke: 'Vejnavn.CSV',
  adgangsadresse: 'Adgangsadresse.CSV',
  adresse: 'Enhedsadresse.CSV',
  meta: 'SenesteHaendelse.CSV'
};

var legacyFileNames = {
  vejstykke: 'RoadName.csv.gz',
  adgangsadresse: 'AddressAccess.csv.gz',
  adresse: 'AddressSpecific.csv.gz'
};

var bbrFileStreams = function(dataDir, filePrefix) {
  return _.reduce(bbrFileNames, function(memo, filename, key) {
    memo[key] = function() {
      return fs.createReadStream(dataDir + '/' + filePrefix + filename);
    };
    return memo;
  }, {});
};

var legacyFileStreams = function(dataDir) {
  return _.reduce(legacyFileNames, function(memo, filename, key) {
    memo[key] = function() {
      var stream = fs.createReadStream(dataDir +'/' + filename);
      var unzipped = stream.pipe(zlib.createGunzip());
      unzipped.setEncoding('utf8');
      return unzipped;
    };
    return memo;
  }, {});
};

function loadBbrMeta(bbrFileStreams, callback) {
  csv().from.stream(bbrFileStreams.meta(), {
    delimiter: ';',
    quote: '"',
    escape: '\\',
    columns: true,
    encoding: 'utf8'
  }).to.array(function(data) {
      if(data.length > 1) {
        callback(new Error("Unexpected length of SenesteHaendelse.CSV: " + data.length));
      }
      if(data.length === 1) {
        callback(null, data);
      }
    });
}

function loadLastSequenceNumber(client, fileStreams, callback) {
  loadBbrMeta(fileStreams, function(err, meta) {
    console.log('Seneste sekvensnummer: ' + meta.sidstSendtHaendelsesNummer);

    client.query('UPDATE bbr_sekvensnummer SET sequence_number = $1', [meta.sidstSendtHaendelsesNummer || 0], callback);
  });
}

exports.loadCsvOnly = function(client, options, callback) {
  var format = options.format;
  var dataDir = options.dataDir;
  var filePrefix = options.filePrefix || '';
  var tablePrefix = options.tablePrefix || '';

  var transformers = format === 'legacy' ? legacyTransformers : bbrTransformers;
  var fileStreams = format == 'legacy' ? legacyFileStreams(dataDir) : bbrFileStreams(dataDir, filePrefix);
  async.series([
    function(callback) {
      console.log("Indlæser vejstykker....");
      var vejstykkerStream = fileStreams.vejstykke();
      loadCsv(client, vejstykkerStream, {
        tableName : tablePrefix + 'Vejstykker',
        columns : ['kode', 'kommunekode', 'oprettet', 'aendret', 'vejnavn', 'adresseringsnavn'],
        transformer: transformers.vejstykke

      }, callback);
    },
    function(callback) {
      console.log("Indlæser adgangsadresser....");
      var adgangsAdresserStream = fileStreams.adgangsadresse();
      loadCsv(client, adgangsAdresserStream, {
        tableName : tablePrefix + 'Adgangsadresser',
        columns : ['id', 'vejkode', 'kommunekode',
          'husnr', 'supplerendebynavn',
          'postnr', 'ejerlavkode', 'ejerlavnavn', 'matrikelnr', 'esrejendomsnr',
          'oprettet', 'ikraftfra', 'aendret', 'adgangspunktid', 'etrs89oest', 'etrs89nord', 'wgs84lat', 'wgs84long',
          'noejagtighed', 'kilde', 'tekniskstandard', 'tekstretning', 'kn100mdk', 'kn1kmdk', 'kn10kmdk', 'adressepunktaendringsdato'],
        transformer: transformers.adgangsadresse

      }, callback);
    },
    function(callback) {
      console.log("Indlæser adresser....");
      var adresserStream = fileStreams.adresse();
      loadCsv(client, adresserStream, {
        tableName : tablePrefix + 'Enhedsadresser',
        columns : ['id', 'adgangsadresseid', 'oprettet', 'aendret', 'ikraftfra', 'etage', 'doer'],
        transformer: transformers.adresse

      }, callback);
    }
  ], callback);
};

function initializeHistory(client) {
  return function(callback) {
    async.eachSeries(['vejstykke', 'adgangsadresse', 'adresse'], function(entityName, callback) {
      var datamodel = datamodels[entityName];
      var query = 'INSERT INTO ' + datamodel.table + '_history (' + datamodel.columns.join(', ') + ') (select ' + datamodel.columns.join(', ') + ' from ' + datamodel.table + ')';
      client.query(query, [], callback);
    }, callback);
  };
}

exports.load = function(client, options, callback) {
  var format = options.format;
  var dataDir = options.dataDir;
  var filePrefix = options.filePrefix;
  var fileStreams = format == 'legacy' ? legacyFileStreams(dataDir) : bbrFileStreams(dataDir, filePrefix);

  async.series([
    sqlCommon.disableTriggers(client),
    function(cb) {
      exports.loadCsvOnly(client, options, cb);
    },
    function(callback) {
      if(options.format === 'bbr') {
        loadLastSequenceNumber(client, fileStreams, callback);
      }
      else {
        callback();
      }
    },
    initializeHistory(client),
    sqlCommon.initializeTables(client),
    sqlCommon.enableTriggers(client)
  ], callback);
};

exports.bbrFileStreams = bbrFileStreams;
exports.loadBbrMeta = loadBbrMeta;
exports.loadCsv = loadCsv;