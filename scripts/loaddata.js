var fs = require('fs');
var pg = require('pg');
var copyFrom = require('pg-copy-streams').from;
var zlib = require('zlib');
var byline = require('byline');
var csv = require('csv');
var stream = require('stream');
var async = require('async');

var conString = "postgres://ahj@localhost/dawa";
var client = new pg.Client(conString);

function loadCsv(client, gzippedInputStream, options, callback) {

// There is a bug in the input format, where double quotes are not escaped.
  var doubleQuoteEscaper = new stream.Transform({ objectMode: true });
  doubleQuoteEscaper._transform = function (line, encoding, done) {
    line = line.replace(/;""/g, ';"\\"');
    line = line.replace(/"";/g, '\\"";');
    this.push(line + '\n');
    done();
  };

  var unzipped = gzippedInputStream.pipe(zlib.createGunzip());
  unzipped.setEncoding("utf8");

  var inputByLine = byline(unzipped);

  inputByLine.pipe(doubleQuoteEscaper);

  var sql = "COPY " + options.tableName + " FROM STDIN WITH (ENCODING 'utf8',HEADER TRUE, FORMAT csv, DELIMITER ';', QUOTE '\"')";
  var pgStream = client.query(copyFrom(sql));

  csv().from.stream(doubleQuoteEscaper, {
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

client.connect(function (err) {
  if(err) {
    return console.error('could not connect to postgres', err);
  }
  async.series([
    function(callback) {
      console.log("Indlæser postnumre....");
      var postnumreStream = fs.createReadStream('data/PostCode.csv.gz');
      loadCsv(client, postnumreStream, {
        tableName : 'Postnumre',
        columns : ['nr', 'version', 'navn'],
        transformer: function(row, idx) {
          if(idx % 1000 === 0) {
            console.log(idx + ", " + row.PostCodeIdentifier);
          }
          return {
            nr : row.PostCodeIdentifier,
            version: row.VersionId,
            navn : row.DistrictName
          };
        }
      }, callback);
    },
    function(callback) {
      console.log("Indlæser vejnavne....");
      var vejnavneStream = fs.createReadStream('data/RoadName.csv.gz');
      loadCsv(client, vejnavneStream, {
        tableName : 'Vejnavne',
        columns : ['kode', 'kommunekode', 'version', 'vejnavn'],
        transformer: function(row, idx) {
          if(idx % 1000 === 0) {
            console.log(idx);
          }
          return {
            kode : row.StreetCode,
            kommunekode: row.MunicipalityCode,
            version: row.VersionId,
            vejnavn : row.StreetName
          };
        }

      }, callback);
    },
    function(callback) {
      console.log("Indlæser enhedsadresser....");
  var enhedsadresserStream = fs.createReadStream('data/AddressSpecific.csv.gz');
      loadCsv(client, enhedsadresserStream, {
        tableName : 'Enhedsadresser',
        columns : ['id', 'version', 'adgangsadresseId', 'oprettet', 'aendret', 'etage', 'doer'],
        transformer: function(row, idx) {
          if(idx % 1000 === 0) {
            console.log(idx);
          }
          return {
            id : row.AddressSpecificIdentifier,
            version: row.VersionId,
            adgangsadresseId : row.AddressAccessReference,
            oprettet : row.AddressSpecificCreateDate,
            aendret : row.AddressSpecificChangeDate,
            etage : row.FloorIdentifier,
            doer : row.SuiteIdentifier
          };
        }

      }, callback);
    },
    function(callback) {
      console.log("Indlæser adgangsadresser....");
      var adgangsAdresserStream = fs.createReadStream('data/AddressAccess.csv.gz');
      loadCsv(client, adgangsAdresserStream, {
        tableName : 'Adgangsadresser',
        columns : ['id', 'version', 'vejkode', 'kommunekode', 'husnr', 'postnr', 'ejerlavkode', 'ejerlavnavn', 'matrikelnr', 'oprettet', 'aendret', 'etrs89oest', 'etrs89nord', 'wgs84'],
        transformer: function(row, idx) {
          if(idx % 1000 === 0) {
            console.log(idx);
          }
          return {
            id: row.AddressAccessIdentifier,
            version: row.VersionId,
            vejkode: row.StreetCode,
            kommunekode: row.MunicipalityCode,
            husnr: row.StreetBuildingIdentifier,
            postnr: row.PostCodeIdentifier,
            ejerlavkode: row.CadastralDistrictIdentifier,
            ejerlavnavn: row.CadastralDistrictName,
            matrikelnr: row.LandParcelIdentifier,
            oprettet: row.AddressAccessCreateDate,
            aendret: row.AddressAccessChangeDate,
            etrs89oest: null,
            etrs89nord: null,
            wgs84: row.WGS84GeographicLatitude ? 'SRID=4326;POINT(' + row.WGS84GeographicLatitude + ' ' + row.WGS84GeographicLongitude + ')' : null
          };
        }

      }, callback);
    }
  ], function(err, result) {
    if(err) {
      console.error("error loading data", err);
    }
    client.end();
  });

});