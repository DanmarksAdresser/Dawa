"use strict";

var async = require('async');
var csvParse = require('csv-parse');
var csvStringify = require('csv-stringify');
var combine = require('stream-combiner');
var es      = require('event-stream');
var copyFrom = require('pg-copy-streams').from;
var fs = require('fs');
var zlib = require('zlib');
var _ = require('underscore');

var sqlCommon = require('./common');
var initialization = require('./initialization');
var bbrTransformers = require('../bbr/common/bbrTransformers');
var datamodels = require('../crud/datamodel');

function loadCsv(client, inputStream, options, callback) {
  var sql = "COPY " + options.tableName + "(" + options.columns.join(',') + ") FROM STDIN WITH (ENCODING 'utf8',HEADER TRUE, FORMAT csv, DELIMITER ';', QUOTE '\"', NULL '')";
  var pgStream = client.query(copyFrom(sql));
  var csvOptions = options.csvOptions ? options.csvOptions : {
    delimiter: ';',
    quote: '"',
    escape: '\\',
    columns: true
  };
  inputStream.pipe(csvParse(csvOptions)).pipe(es.mapSync(options.transformer)).pipe(csvStringify({
    delimiter: ';',
    quote: '"',
    escape: '\\',
    columns: options.columns,
    header: true,
    encoding: 'utf8'
  })).pipe(pgStream);
  pgStream.on('error', function(err) {
    callback(err);
  });
  pgStream.on('end', function() {
    callback();
  });
}

var legacyTransformers = {
  vejstykke: function(row, idx) {
    return {
      kode : row.StreetCode,
      kommunekode: row.MunicipalityCode,
      vejnavn : row.StreetName,
      adresseringsnavn: null
    };
  },
  adresse: function(row, idx) {
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
    return {
      id: row.AddressAccessIdentifier,
      vejkode: row.StreetCode,
      kommunekode: row.MunicipalityCode,
      husnr: row.StreetBuildingIdentifier,
      supplerendebynavn: row.DistrictSubdivisionIdentifier,
      postnr: row.PostCodeIdentifier,
      ejerlavkode: row.CadastralDistrictIdentifier,
      matrikelnr: row.LandParcelIdentifier,
      esrejendomsnr: row.MunicipalRealPropertyIdentifier,
      oprettet: row.AddressAccessCreateDate,
      ikraftfra: row.AddressAccessValidDate,
      aendret: row.AddressAccessChangeDate,
      etrs89oest: row.ETRS89utm32Easting,
      etrs89nord: row.ETRS89utm32Northing,
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
      return fs.createReadStream(dataDir + '/' + filePrefix + filename, { encoding: 'utf8'});
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
  var parser = csvParse({
    delimiter: ';',
    quote: '"',
    escape: '\\',
    columns: true
  });
  combine(bbrFileStreams.meta(), parser, es.writeArray(function(err, data) {
    if(err) {
      return callback(err);
    }
    if(data.length > 1) {
      console.log(JSON.stringify(data));
      return callback(new Error("Unexpected length of SenesteHaendelse.CSV: " + data.length));
    }
    if(data.length === 1) {
      return callback(null, data[0]);
    }
    return callback(null, {totalSendteHaendelser: 0});
  }));
}

function loadLastSequenceNumber(client, fileStreams, callback) {
  loadBbrMeta(fileStreams, function(err, meta) {
    // navngivningen i BBR filen er mærkelig. Vi skal bruge totalSendteHaendelser. sidstSendtHaendelsesNummer
    // er et internt felt, som vi ikke kan bruge til ngoet.

    client.query('UPDATE bbr_sekvensnummer SET sequence_number = $1', [(meta.totalSendteHaendelser || 1)-1], callback);
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
      var vejstykkerStream = fileStreams.vejstykke();
      loadCsv(client, vejstykkerStream, {
        tableName : tablePrefix + 'Vejstykker',
        columns : ['kode', 'kommunekode', 'oprettet', 'aendret', 'vejnavn', 'adresseringsnavn'],
        transformer: transformers.vejstykke

      }, callback);
    },
    function(callback) {
      var adgangsAdresserStream = fileStreams.adgangsadresse();
      loadCsv(client, adgangsAdresserStream, {
        tableName : tablePrefix + 'Adgangsadresser',
        columns : ['id', 'vejkode', 'kommunekode',
          'husnr', 'supplerendebynavn',
          'postnr', 'ejerlavkode', 'matrikelnr', 'esrejendomsnr', 'objekttype',
          'oprettet', 'ikraftfra', 'aendret', 'adgangspunktid', 'etrs89oest', 'etrs89nord',
          'noejagtighed', 'kilde', 'tekniskstandard', 'tekstretning', 'adressepunktaendringsdato'],
        transformer: transformers.adgangsadresse

      }, callback);
    },
    function(callback) {
      var adresserStream = fileStreams.adresse();
      loadCsv(client, adresserStream, {
        tableName : tablePrefix + 'Enhedsadresser',
        columns : ['id', 'adgangsadresseid', 'objekttype', 'oprettet', 'aendret', 'ikraftfra', 'etage', 'doer'],
        transformer: transformers.adresse

      }, callback);
    }
  ], callback);
};

var initializeHistoryTable = function (client, entityName, callback) {
  var datamodel = datamodels[entityName];
  var query = 'INSERT INTO ' + datamodel.table + '_history (' + datamodel.columns.join(', ') + ') (select ' + datamodel.columns.join(', ') + ' from ' + datamodel.table + ')';
  client.query(query, [], callback);
};

function initializeHistory(client) {
  return function(callback) {
    async.eachSeries(['vejstykke', 'adgangsadresse', 'adresse'],
      function(entityName, callback) {
        initializeHistoryTable(client, entityName, callback);
      },
      callback);
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
    initialization.initializeTables(client),
    sqlCommon.enableTriggers(client)
  ], callback);
};

exports.bbrFileStreams = bbrFileStreams;
exports.loadBbrMeta = loadBbrMeta;
exports.loadCsv = loadCsv;
exports.initializeHistoryTable = initializeHistoryTable;