"use strict";

var _ = require('underscore');

var datamodels = { vejstykke: require('../../crud/datamodel').vejstykke };
var mappings = require('./columnMappings');

// maps column names to field names
var columnNameMaps = _.reduce(mappings, function(memo, columnSpec, key) {
  memo[key] = _.reduce(columnSpec, function(memo, col) {
    memo[col.column] = memo[col.name] || col.name;
    return memo;
  }, {});
  return memo;
}, {});

function createSqlString(dataModelName, datamodel, seqFromAlias, seqToAlias) {
  function whereClause(column, seqFromAlias, seqToAlias) {
    if(_.isUndefined(seqFromAlias) && _.isUndefined(seqToAlias)) {
      return '';
    }
    else {
      var clauses = [];
      if(!_.isUndefined(seqFromAlias)) {
        clauses.push(column + ' >= ' + seqFromAlias);
      }
      if(!_.isUndefined(seqToAlias)) {
        clauses.push(column + ' <= ' + seqToAlias);
      }
      return clauses.join(' AND ');
    }
  }
  var hasClause = !_.isUndefined(seqFromAlias) || !_.isUndefined(seqToAlias);

  function selectFields() {
    return datamodel.columns.map(function(columnName) {
      return columnName + ' AS ' + columnNameMaps[dataModelName][columnName];
    }).join(', ');
  }

  return "(SELECT h.operation as operation, h.time as time, valid_from AS sekvensnummer, " + selectFields() +
    "  FROM vejstykker_history main JOIN transaction_history h ON (main.valid_from = h.sequence_number)) " + (hasClause ? " WHERE " + whereClause('main.valid_from', seqFromAlias, seqToAlias) : '') + " UNION " +
    "(SELECT 'delete' AS type, h.time as time, valid_to AS sekvensnummer, " + datamodel.columns.join(', ') + " " +
    " FROM vejstykker_history main JOIN transaction_history h ON (main.valid_to = h.sequence_number) " +
    " WHERE NOT EXISTS(SELECT 1 FROM vejstykker_history h2 WHERE " +
    (hasClause ? whereClause('main.valid_from', seqFromAlias, seqToAlias) + ' AND ' : '') +
    " h2.valid_from = main.valid_to AND main.kommunekode = h2.kommunekode AND main.kode = h2.kode)) ORDER BY sekvensnummer;";
}

var sqlModels = _.reduce(datamodels, function(memo, datamodel, dataModelName) {
  memo[dataModelName] = {
    allSelectableFieldNames: function() {
      return ['sekvensnummer', 'operation'].concat(_.map(datamodel.columns, function(colName) {
        return columnNameMaps[dataModelName][colName];
      }));
    },
    createQuery: function(fieldNames, params) {
      var seqFromAlias, seqToAlias, sqlParams = [];
      if(params.sekvensnummerfra) {
        sqlParams.push(params.sekvensnummerfra);
        seqFromAlias = sqlParams.length;
      }
      if(params.sekvensnummertil) {
        sqlParams.push(params.sekvensnummertil);
        seqToAlias = sqlParams.length;
      }
      return {
        sql: createSqlString(dataModelName, datamodel, seqFromAlias, seqToAlias),
        params: sqlParams
      };
    }
  };
  return memo;
}, {});

var registry = require('../registry');
_.each(sqlModels, function(sqlModel, key) {
  registry.add(key + '_hændelse', 'sqlModel', undefined, sqlModel);
});