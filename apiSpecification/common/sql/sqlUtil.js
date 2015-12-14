"use strict";

var util = require('util');
var _ = require('underscore');

var dbapi = require('../../../dbapi');
var fallbackStream = require('../../../fallback-stream');

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
      if (column.as) {
        clause += ' as ' + column.as;
      }
      else if (clause !== fieldName) {
        clause += ' as ' + fieldName;
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
  return {
    allSelectableFieldNames: function(allFieldNames) {
      return allSelectableFieldNames(allFieldNames, columnSpec);
    },
    createQuery: function(fieldNames, params) {
      var sqlParts = baseQuery();
      applySelect(sqlParts,columnSpec, fieldNames,params);
      parameterImpls.forEach(function(parameterImpl) {
        parameterImpl(sqlParts, params);
      });
      return dbapi.createQuery(sqlParts);
    },
    query: function(client, fieldNames, params, callback) {
      var query = this.createQuery(fieldNames, params);
      return dbapi.queryRaw(client, query.sql, query.params).nodeify(callback);
    },
    stream: function(client, fieldNames, params, callback) {
      var query = this.createQuery(fieldNames, params);
      return dbapi.streamRaw(client, query.sql, query.params).nodeify(callback);
    }
  };
};

exports.applyFallback = function(sqlModel, fallbackParamsFn) {
  var fallbackModel = {
    allSelectableFieldNames: sqlModel.allSelectableFieldNames
  };
  fallbackModel.query = function(client, fieldNames, params, callback) {
    var paramList = fallbackParamsFn(params);
    sqlModel.query(client, fieldNames, paramList[0], function(err, result) {
      if(err) {
        return callback(err);
      }
      if(paramList.length === 1) {
        return callback(undefined, result);
      }
      if(result.length === 0) {
        sqlModel.query(client, fieldNames, paramList[1], callback);
      }
      else {
        callback(undefined, result);
      }
    });
  };
  fallbackModel.stream = function(client, fieldNames, params, callback) {
    var paramList = fallbackParamsFn(params);
    sqlModel.stream(client, fieldNames, paramList[0], function(err, stream) {
      if(err) {
        return callback(err);
      }
      if(paramList.length === 1) {
        return callback(undefined, stream);
      }
      return callback(undefined, fallbackStream(stream, function(callback) {
        sqlModel.stream(client, fieldNames, paramList[1], callback);
      }));
    });
  };
  return fallbackModel;
};

exports.applyFallbackToFuzzySearch = function(sqlModel) {
  return exports.applyFallback(sqlModel, function(params) {
    var q = params.search || params.autocomplete;
    if(q && params.fuzzy) {
      q = q.replace('*', '');
      var unfuzzyParams = _.clone(params);
      delete unfuzzyParams.fuzzy;

      var fuzzyParams = _.clone(params);
      delete fuzzyParams.search;
      delete fuzzyParams.autocomplete;
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
