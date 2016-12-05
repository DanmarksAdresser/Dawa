"use strict";

// Generic utility functions for importing data to PostgreSQL
const copyFrom = require('pg-copy-streams').from;
const csvParse = require('csv-parse');
const csvStringify = require('csv-stringify');
const es = require('event-stream');
const Readable = require('stream').Readable;
const fs = require('fs');
const q = require('q');
const split2 = require('split2');
const through2 = require('through2');
const _ = require('underscore');

const promisingStreamCombiner = require('../promisingStreamCombiner');

const PSQL_CSV_OPTIONS = {
  delimiter: ';',
  quote: '"',
  escape: '\\',
  header: true,
  encoding: 'utf8'
};

function streamToTablePipeline(client, targetTable, columns, mapFn) {
  mapFn = mapFn || _.identity;
  var pgStream = copyStream(client, targetTable, columns);
  return [through2.obj(function (obj, enc, callback) {
    try {
      const result = mapFn(obj);
      const csvResult = postgresify(result);
      callback(null, csvResult);
    }
    catch (e) {
      callback(e);
    }
  }),
    copyStreamStringifier(columns),
    pgStream
  ];
}

/**
 * Create a PostgreSQL COPY stream, which accepts CSV streams made by copyStreamStringifier
 */
function copyStream(client, table, columnNames) {
  var sql = "COPY " + table + "(" + columnNames.join(',') + ") FROM STDIN WITH (ENCODING 'utf8',HEADER TRUE, FORMAT csv, DELIMITER ';', QUOTE '\"', ESCAPE '\\', NULL '')";
  return client.query(copyFrom(sql));
}

function copyStreamStringifier(columns) {
  return csvStringify(_.extend({columns: columns}, PSQL_CSV_OPTIONS));
}

function dropTable(client, tableName) {
  return client.queryBatched('DROP TABLE IF EXISTS ' + tableName);
}

function createTempTableFromTemplate(client, targetTable, templateTable, columns) {
  return client.queryp(`CREATE TEMP TABLE  ${targetTable} AS
     select ${columns.join(', ')} FROM ${templateTable} WHERE false`);
}

function postgresify(obj) {
  return _.mapObject(obj, (value) => {
    if(value && value.toPostgres) {
      return value.toPostgres();
    }
    else {
      return value;
    }
  });
}

/**
 * Stream an array of objects to a postgreSQL table using COPY stream
 * @param client
 * @param array
 * @param targetTable
 * @param columns
 * @returns {*}
 */
function streamArrayToTable(client, array, targetTable, columns) {
  return q.async(function*() {
    const inputStream = es.readArray(array);
    yield promisingStreamCombiner([
      inputStream].concat(streamToTablePipeline(client, targetTable, columns)));
  })();
}

/**
 * Stream an NDJSON file to a table using COPY
 * @param client
 * @param filePath
 * @param targetTable
 * @param columns
 * @param mapFn
 * @returns {*}
 */
function streamNdjsonToTable(client, filePath, targetTable, columns, mapFn) {
  var inputStream = fs.createReadStream(filePath, {encoding: 'utf8'});
  mapFn = mapFn || _.identity;
  const parseAndMapFn = str => {
    const parsed = JSON.parse(str);
    return mapFn(parsed);
  }
  return promisingStreamCombiner(
    [
      inputStream,
      split2()
    ]
      .concat(streamToTablePipeline(client, targetTable, columns, parseAndMapFn)));
}

const DATA_CSV_OPTIONS = {
  delimiter: ';',
  quote: '"',
  escape: '\\',
  columns: true
};

function streamCsvToTable(client, filePath, targetTable, columns, mapFn) {
  var inputStream = fs.createReadStream(filePath, {encoding: 'utf8'});
  const streams =  [
    inputStream,
    csvParse(Object.assign({}, DATA_CSV_OPTIONS))
  ].concat(streamToTablePipeline(client, targetTable, columns, mapFn));
  return promisingStreamCombiner(streams);
}

class ArrayStream extends Readable {
  constructor(arr) {
    super({objectMode: true});
    if (!Array.isArray(arr))
      throw new TypeError('First argument must be an Array');
    this._i = 0;
    this._arr = arr;
  }

  _read(size) {
    this.push(this._i < this._arr.length ? this._arr[this._i++] : null);
  }
}

const streamArray = (arr) => new ArrayStream(arr);

module.exports = {
  copyStream: copyStream,
  copyStreamStringifier: copyStreamStringifier,
  dropTable: dropTable,
  createTempTableFromTemplate: createTempTableFromTemplate,
  streamArrayToTable: streamArrayToTable,
  streamCsvToTable: streamCsvToTable,
  streamNdjsonToTable: streamNdjsonToTable,
  streamArray: streamArray,
  streamToTablePipeline: streamToTablePipeline
};
