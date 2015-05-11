"use strict";

var databaseTypes = require('../psql/databaseTypes');
var types = require('./csvTypes');

var Range = databaseTypes.Range;

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
  },
  {
    name: 'dbregistreringstart',
    type: types.timestamp
  },
  {
    name: 'dbregistreringslut',
    type: types.timestamp
  }
];


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
    toTimeInterval('dbregistrering');
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

module.exports = {
  transform: transform,
  transformCsv: transformCsv
};