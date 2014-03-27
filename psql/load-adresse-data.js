"use strict";

var async = require('async');
var cli = require('cli');
var csv = require('csv');
var copyFrom = require('pg-copy-streams').from;
var fs = require('fs');
var winston = require('winston');
var zlib = require('zlib');
var _ = require('underscore');

var cliParameterParsing = require('../bbr/common/cliParameterParsing');
var sqlCommon = require('./common');

var optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
  dataDir: [false, 'Folder med CSV-filer (gzippede)', 'string'],
  format: [false, 'CSV format (legacy eller bbr)', 'string', 'bbr']
};

cli.parse(optionSpec, []);

function loadCsv(client, gzippedInputStream, options, callback) {

  var unzipped = gzippedInputStream.pipe(zlib.createGunzip());
  unzipped.setEncoding("utf8");

  var sql = "COPY " + options.tableName + "("  + options.columns.join(',') + ") FROM STDIN WITH (ENCODING 'utf8',HEADER TRUE, FORMAT csv, DELIMITER ';', QUOTE '\"')";
  var pgStream = client.query(copyFrom(sql));

  csv().from.stream(unzipped, {
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

function exitOnErr(err){
  if (err){
    winston.error("Error: %j", err, {});
    process.exit(1);
  }
}


var legacyTransformers = {
  postnummer: function(row, idx) {
    if(idx % 1000 === 0) {
      console.log(idx + ", " + row.PostCodeIdentifier);
    }
    return {
      nr : row.PostCodeIdentifier,
      version: row.VersionId,
      navn : row.DistrictName
    };
  },
  vejstykke: function(row, idx) {
    if(idx % 1000 === 0) {
      console.log(idx);
    }
    return {
      kode : row.StreetCode,
      kommunekode: row.MunicipalityCode,
      version: row.VersionId,
      vejnavn : row.StreetName
    };
  },
  enhedsadresse: function(row, idx) {
    if(idx % 1000 === 0) {
      console.log(idx);
    }
    return {
      id : row.AddressSpecificIdentifier,
      version: row.VersionId,
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
      version: row.VersionId,
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

var bbrTransformers = {
  postnummer: function(row) {
    return row;
  },
  vejstykke: function(row) {
    return row;
  },
  enhedsadresse: function(row) {
    return row;
  },
  adgangsadresse: function(row) {
    return row;
  }
};

cli.main(function(args, options) {
  cliParameterParsing.addEnvironmentOptions(optionSpec, options);
  process.env.pgConnectionUrl = options.pgConnectionUrl;

  var transformers = options.format === 'legacy' ? legacyTransformers : bbrTransformers;
  cliParameterParsing.checkRequiredOptions(options, _.keys(optionSpec));

  var dataDir = options.dataDir;
  sqlCommon.withWriteTranaction(options.pgConnectionUrl, function(err, client, callback) {
    exitOnErr(err);
    async.series([
      sqlCommon.disableTriggers(client),
      function(callback) {
        console.log("Indlæser postnumre....");
        var postnumreStream = fs.createReadStream( dataDir + '/PostCode.csv.gz');
        loadCsv(client, postnumreStream, {
          tableName : 'Postnumre',
          columns : ['nr', 'version', 'navn'],
          transformer: transformers.postnummer
        }, callback);
      },
      function(callback) {
        console.log("Indlæser vejnavne....");
        var vejnavneStream = fs.createReadStream(dataDir + '/RoadName.csv.gz');
        loadCsv(client, vejnavneStream, {
          tableName : 'Vejstykker',
          columns : ['kode', 'kommunekode', 'version', 'vejnavn'],
          transformer: transformers.vejstykke

        }, callback);
      },
      function(callback) {
        console.log("Indlæser enhedsadresser....");
        var enhedsadresserStream = fs.createReadStream(dataDir + '/AddressSpecific.csv.gz');
        loadCsv(client, enhedsadresserStream, {
          tableName : 'Enhedsadresser',
          columns : ['id', 'version', 'adgangsadresseid', 'oprettet', 'aendret', 'etage', 'doer'],
          transformer: transformers.enhedsadresse

        }, callback);
      },
      function(callback) {
        console.log("Indlæser adgangsadresser....");
        var adgangsAdresserStream = fs.createReadStream(dataDir + '/AddressAccess.csv.gz');
        loadCsv(client, adgangsAdresserStream, {
          tableName : 'Adgangsadresser',
          columns : ['id', 'version', 'vejkode', 'kommunekode',
            'husnr', 'supplerendebynavn',
            'postnr', 'ejerlavkode', 'ejerlavnavn', 'matrikelnr', 'esrejendomsnr',
            'oprettet', 'ikraftfra', 'aendret', 'etrs89oest', 'etrs89nord', 'wgs84lat', 'wgs84long',
          'noejagtighed', 'kilde', 'tekniskstandard', 'tekstretning', 'kn100mdk', 'kn1kmdk', 'kn10kmdk', 'adressepunktaendringsdato'],
          transformer: transformers.adgangsadresse

        }, callback);
      },
      sqlCommon.initializeTables(client),
      sqlCommon.enableTriggers(client)
    ], function(err) {
      exitOnErr(err);
      callback(err, function(err) {
        exitOnErr(err);
      });
    });
  });
});