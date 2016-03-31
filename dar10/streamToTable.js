"use strict";

/*
 * Stream a DAR 1.0 supplied ndjson file to a PostgreSQL table. Optionally validates every
 * object.
 */
const copyFrom = require('pg-copy-streams').from;
const csvStringify = require('csv-stringify');
const fs = require('fs');
const split2 = require('split2');
const through2 = require('through2');
const _ = require('underscore');

const postgresMapper = require('./postgresMapper');
const promisingStreamCombiner = require('../promisingStreamCombiner');


const PSQL_CSV_OPTIONS = {
  delimiter: ';',
  quote: '"',
  escape: '\\',
  header: true,
  encoding: 'utf8'
};

function createCopyStream(client, table, columnNames) {
  var sql = "COPY " + table + "(" + columnNames.join(',') + ") FROM STDIN WITH (ENCODING 'utf8',HEADER TRUE, FORMAT csv, DELIMITER ';', QUOTE '\"', ESCAPE '\\', NULL '')";
  return client.query(copyFrom(sql));
}

module.exports = function(client, entityName, filePath, targetTable, validate) {
  const columnNames = postgresMapper.columns[entityName];
  var pgStream = createCopyStream(client, targetTable, columnNames);
  var inputStream = fs.createReadStream(filePath, {encoding: 'utf8'});
  const mapFn = postgresMapper.createMapper(entityName, validate);
  return promisingStreamCombiner([
    inputStream,
    split2(),
    through2.obj(function(line, enc, callback) {
      const json = JSON.parse(line);
      try {
        const result = mapFn(json);
        const csvResult = _.mapObject(result, (value) => {
          if(value && value.toPostgres) {
            return value.toPostgres();
          }
          else {
            return value;
          }
        });
        callback(null, csvResult);
      }
      catch(e) {
        callback(e);
      }
    }),

    csvStringify(_.extend({columns: columnNames}, PSQL_CSV_OPTIONS)),
    pgStream
  ]);
};
