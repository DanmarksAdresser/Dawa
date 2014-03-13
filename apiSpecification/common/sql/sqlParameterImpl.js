"use strict";

var _ = require('underscore');

var sqlUtil = require('./sqlUtil');
var dbapi = require('../../../dbapi');
var util = require('../../util');

var notNull = util.notNull;

function toPgSearchQuery(q) {
  // remove all special chars
  q = q.replace(/[^a-zA-Z0-9ÆæØøÅåéE\*]/g, ' ');

  // replace '*' not at the end of a token with ' '
  q = q.replace(/[\*]([^ ])/g, ' $1');

  // remove any tokens consisting only of '*'
  q = q.replace(/(^|[ ])[\*]/g, ' ');

  // normalize whitespace
  q = q.replace(/\s+/g, ' ');

  // remove leading / trailing whitespace
  q = q.replace(/^\s*/g, '');
  q = q.replace(/\s*$/g, '');

  // tokenize the query
  var tokens = q.split(' ');

  tokens = _.map(tokens, function(token) {
    if(endsWith(token, '*')) {
      token = token.substring(0, token.length - 1) + ':*';
    }
    return token;
  });

  return tokens.join(' & ');
}

function endsWith (str, suffix) {
  return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

function toPgSuggestQuery(q) {
  // normalize whitespace
  q = q.replace(/\s+/g, ' ');

  var hasTrailingWhitespace = /.*\s$/.test(q);
  var tsq = toPgSearchQuery(q);

  // Since we do suggest, if there is no trailing whitespace,
  // the last search clause should be a prefix search
  if (!hasTrailingWhitespace && !endsWith(tsq, '*')) {
    tsq += ":*";
  }
  return tsq;
}

function getSearchColumn(columnSpec) {
  return sqlUtil.getColumnNameForWhere(columnSpec, 'tsv');
}

function searchWhereClause(paramAlias, columnSpec) {
  var columnName = getSearchColumn(columnSpec);
  return "(" + columnName + " @@ to_tsquery('danish', " + paramAlias + "))";
}

function searchOrderClause(paramAlias, columnSpec) {
  var columnName = getSearchColumn(columnSpec);
  return 'ts_rank(' + columnName + ", to_tsquery('danish'," + paramAlias + ')) DESC';
}


/*
 * Adds a simple equality where clause. Supports multi parameters.
 */
exports.simplePropertyFilter = function(parameterSpec, columnSpec) {
  return function(sqlParts, params) {
    parameterSpec.forEach(function (parameter) {
      var name = parameter.name;
      var values = params[name];

      if (values !== undefined)
      {
        if (values.length === 1)
        {
          var value = values[0];
          var parameterAlias = dbapi.addSqlParameter(sqlParts, value);
          var column = sqlUtil.getColumnNameForWhere(columnSpec, name);
          sqlParts.whereClauses.push(column + " = " + parameterAlias);
        }
        else
        {
          var orClauses = _.map(values,
            function(value){
              var parameterAlias = dbapi.addSqlParameter(sqlParts, value);
              var column = sqlUtil.getColumnNameForWhere(columnSpec, name);
              return (column + " = " + parameterAlias);
            });
          sqlParts.whereClauses.push("("+orClauses.join(" OR ")+")");
        }
      }
    });
  };
};

function applyTsQuery(sqlParts, tsQuery, columnSpec) {
  var parameterAlias = dbapi.addSqlParameter(sqlParts, tsQuery);
  dbapi.addWhereClause(sqlParts, searchWhereClause(parameterAlias, columnSpec));
  sqlParts.orderClauses.unshift(searchOrderClause(parameterAlias, columnSpec));
}

/*
 * Applies a search query and orders the results by rank
 * assumes the search query parameter is 'q',
 * and that the search field is 'tsv'.
 */
exports.search = function(columnSpec) {
  return function(sqlParts, params) {
    if(notNull(params.search)) {
      var tsQuery = toPgSearchQuery(params.search);
      applyTsQuery(sqlParts, tsQuery, columnSpec);
    }
  };
};

exports.autocomplete = function(columnSpec) {
  return function(sqlParts, params) {
    if(notNull(params.autocomplete)) {
      var tsQuery = toPgSuggestQuery(params.autocomplete);
      applyTsQuery(sqlParts, tsQuery, columnSpec);
    }
  };
};

function toOffsetLimit(paging) {
  if(paging.side && paging.per_side) {
    return {
      offset: (paging.side-1) * paging.per_side,
      limit: paging.per_side
    };
  }
  else {
    return {};
  }
}

function applyOrderByKey(sqlParts,keyArray) {
  keyArray.forEach(function (key) {
    sqlParts.orderClauses.push(key);
  });
}

exports.paging = function(columnSpec, key) {
  return function(sqlParts, params) {
    var offsetLimit = toOffsetLimit(params);
    _.extend(sqlParts, offsetLimit);
    if(params.per_side) {
      applyOrderByKey(sqlParts, key );
    }
  };
};