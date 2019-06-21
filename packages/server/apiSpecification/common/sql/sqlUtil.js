"use strict";

var util = require('util');
var _ = require('underscore');

var dbapi = require('../../../dbapi');
const cursorChannel = require('@dawadk/common/src/postgres/cursor-channel');
const { go } = require('ts-csp');

function existy(obj) {
  return !_.isUndefined(obj) && !_.isNull(obj);
}

exports.selectIsoDate = function(col) {
  return "to_char(" + col + ", 'YYYY-MM-DD\"T\"HH24:MI:SS.MS')";
};

exports.selectIsoDateUtc = function(col) {
  return "to_char(" + col + " AT TIME ZONE 'UTC', 'YYYY-MM-DD\"T\"HH24:MI:SS.MS\"Z\"')";
};

var allSelectableFieldNames = function(allFieldNames, columns) {
  return allFieldNames.filter(function(fieldName) {
    return _.isUndefined(columns[fieldName]) || existy(columns[fieldName].select) || existy(columns[fieldName].column);
  });
};

exports.allSelectableFieldNames = allSelectableFieldNames;

exports.getColumnNameForWhere = function (columnSpec, name) {
  var spec = columnSpec[name];
  if (_.isUndefined(spec)) {
    return name;
  }
  if(!_.isUndefined(spec.column)) {
    return spec.column;
  }
  return spec.where ? spec.where : spec.select;
};

exports.getSearchColumn = function(columnSpec) {
  return exports.getColumnNameForWhere(columnSpec, 'tsv');
};

function addSelect(columnSpec, fieldName, sqlParts, params) {
  var clause;
  if (!columnSpec[fieldName]) {
    clause = fieldName;
  }
  else {
    var column = columnSpec[fieldName];
    var select = column.select || column.column;
    if (select) {
      if (_.isFunction(select)) {
        clause = select(sqlParts, columnSpec, params);
      }
      else {
        clause = select;
      }
      const alias = column.as || fieldName;
      const quoteAlias = alias !== alias.toLowerCase();
      if(quoteAlias || clause !== fieldName) {
        const quotedAlias = quoteAlias ? `"${alias}"` : alias;
        clause +=  ` as ${quotedAlias}`;
      }
    }
    else {
      throw "Unable to create select clause for field name " + fieldName;
    }
  }
  sqlParts.select.push(clause);
}
var applySelect = function(sqlParts, columnSpec, fieldNames, params) {
  fieldNames.forEach( function(fieldName) {
    addSelect(columnSpec, fieldName, sqlParts, params);
  });
};

exports.addSelect = addSelect;

exports.InvalidParametersError = function(message) {
  this.name = 'InvalidParametersError';
  this.message = message || 'Invalid parameter';
};
util.inherits(exports.InvalidParametersError, Error);

exports.assembleSqlModel = function(columnSpec, parameterImpls, baseQuery) {
  const createQuery = (fieldNames, params) => {
      const sqlParts = baseQuery(fieldNames, params);
      applySelect(sqlParts,columnSpec, fieldNames,params);
      parameterImpls.forEach(function(parameterImpl) {
        parameterImpl(sqlParts, params);
      });
      return dbapi.createQuery(sqlParts);
  };
  return {
    allSelectableFieldNames: function(allFieldNames) {
      return allSelectableFieldNames(allFieldNames, columnSpec);
    },
    processQuery: function(client, fieldNames, params) {
      return go(function*() {
        const query = createQuery(fieldNames, params);
        return (yield this.delegateAbort(client.query(query.sql, query.params))).rows || [];
      });
    },
    processStream: function(client, fieldNames, params, channel, options) {
      const query = createQuery(fieldNames, params);
      return cursorChannel(client, query.sql, query.params, channel, options);
    }
  };
};

exports.applyFallback = function(sqlModel, fallbackParamsFn) {
  const fallbackModel = {
    allSelectableFieldNames: sqlModel.allSelectableFieldNames
  };
  fallbackModel.processQuery = function(client, fieldNames, params) {
    return go(function*() {
      const paramList = fallbackParamsFn(params);
      let result;
      for(let params of paramList) {
        result = (yield this.delegateAbort(sqlModel.processQuery(client, fieldNames, params))) || [];
        if(result.length > 0) {
          return result;
        }
      }
      return result;
    });
  };
  fallbackModel.processStream = function (client, fieldNames, params, channel, options) {
    options = options || {};
    const keepOpen = options.keepOpen ? true : false;
    return go(function*() {
      const paramList = fallbackParamsFn(params);
      for (let params of paramList) {

        yield this.delegateAbort(sqlModel.processStream(client, fieldNames, params, channel, {keepOpen: true}));

        if (channel.putCount() > 0) {
          break;
        }
      }
      if(!keepOpen) {
        channel.close();
      }

    });
  }
  return fallbackModel;
};

exports.applyFallbackToFuzzySearch = function(sqlModel) {
  return exports.applyFallback(sqlModel, function(params) {
    var q = params.q;
    if(q && params.fuzzy) {
      q = q.replace('*', '');
      var unfuzzyParams = _.clone(params);
      delete unfuzzyParams.fuzzy;

      var fuzzyParams = _.clone(params);
      delete fuzzyParams.q;
      fuzzyParams.fuzzyq = q;
      return [unfuzzyParams, fuzzyParams];
    }
    else {
      return [params];
    }
  });
};

exports.husnrColumn = {
  select: 'husnr',
    where: function(sqlParts, param, params) {
    var values = param._multi_ ? param.values : [param];
    var clauses = values.map((value) => {
      let paramAlias = dbapi.addSqlParameter(sqlParts, value);
      return `husnr = ${paramAlias}::husnr`;
    }).join(' OR ');
    sqlParts.whereClauses.push(clauses);
  }
};
