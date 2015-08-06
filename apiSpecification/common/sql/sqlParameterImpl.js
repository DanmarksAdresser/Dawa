"use strict";

// This file contains an implementation of the varius SQL WHERE and ORDER clauses that needs
// to be generated based on input parameters.

var _ = require('underscore');

var sqlUtil = require('./sqlUtil');
var dbapi = require('../../../dbapi');
var util = require('../../util');

var notNull = util.notNull;

var dagiTemaer = require('../../temaer/temaer');
var tilknytninger = require('../../tematilknytninger/tilknytninger');

function removeSpecialSearchChars(q) {
  return q.replace(/[^a-zA-Z0-9ÆæØøÅåéÉëËüÜäÄöÖ\*]/g, ' ');
}
function toPgSearchQuery(q) {
  // remove all special chars
  q = removeSpecialSearchChars(q);

  // collapse sequences of * into a single *
  q = q.replace(/\*+/g, '*');

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
  // remove all special chars
  q = removeSpecialSearchChars(q);

  // normalize whitespace
  q = q.replace(/\s+/g, ' ');

  var hasTrailingWhitespace = /.*\s$/.test(q);
  var tsq = toPgSearchQuery(q);

  // Since we do suggest, if there is no trailing whitespace,
  // the last search clause should be a prefix search
  if (!hasTrailingWhitespace && !endsWith(tsq, '*') && tsq.length > 0) {
    tsq += ":*";
  }
  return tsq;
}

function queryForRanking(tsq) {
  return tsq.replace(/ & /g, ' | ');
}

function getSearchColumn(columnSpec) {
  return sqlUtil.getColumnNameForWhere(columnSpec, 'tsv');
}

function searchWhereClause(paramAlias, columnSpec) {
  var columnName = getSearchColumn(columnSpec);
  return "(" + columnName + " @@ to_tsquery('adresser_query', " + paramAlias + "))";
}

function searchOrderClause(paramAlias) {
  var columnName = 'tsv';
  return 'round(1000000 * ts_rank(' + columnName + ", to_tsquery('adresser_query'," + paramAlias + '), 16)) DESC';
}


/*
 * Adds a simple equality where clause. Supports multi parameters.
 */
exports.simplePropertyFilter = function(parameterSpec, columnSpec) {
  return function(sqlParts, params) {
    parameterSpec.forEach(function (parameter) {
      var name = parameter.name;
      var param = params[name];
      if (param !== undefined)
      {
        var whereSpec = sqlUtil.getColumnNameForWhere(columnSpec, name);
        if(_.isFunction(whereSpec)) {
          whereSpec(sqlParts, param, params);
        }
        else {
          var column = whereSpec;
          var paramValues = param === null ? [null] : (param._multi_ ? param.values : [param]);
          var orClauses = _.map(paramValues,
            function(value){
              if(value !== null) {
                var parameterAlias = dbapi.addSqlParameter(sqlParts, value);
                return (column + " = " + parameterAlias);
              }
              else {
                return (column + ' IS NULL');
              }
            });
          sqlParts.whereClauses.push("("+orClauses.join(" OR ")+")");
        }
      }
    });
  };
};

function applyTsQuery(sqlParts, params, tsQuery, columnSpec) {
  var parameterAlias = dbapi.addSqlParameter(sqlParts, tsQuery);
  dbapi.addWhereClause(sqlParts, searchWhereClause(parameterAlias, columnSpec));
  // In order to not examine too many results,
  // we first fetch at most 1000 rows without ranking them in a subselect,
  // and the ranks that result, rather than ranking a very large
  // number of results.
  sqlUtil.addSelect(columnSpec, 'tsv', sqlParts, params);
  sqlParts.limit = 1000;
  var query = dbapi.createQuery(sqlParts);
  var transformedQuery =    {
    select: ['*'],
    from: ['(' + query.sql + ') AS searchResult'],
    whereClauses: [],
    groupBy: '',
    orderClauses: [],
    sqlParams: query.params
  };
  var rankAlias = dbapi.addSqlParameter(sqlParts, queryForRanking(tsQuery));
  transformedQuery.orderClauses.unshift(searchOrderClause(rankAlias));
  _.extend(sqlParts, transformedQuery);

}

/*
 * Applies a search query and orders the results by rank
 * assumes the search query parameter is 'q',
 * and that the search field is 'tsv'.
 */
exports.search = function(columnSpec, orderFields) {
  orderFields = orderFields || [];
  return function(sqlParts, params) {
    if(notNull(params.search)) {
      var tsQuery = toPgSearchQuery(params.search);
      applyTsQuery(sqlParts, params, tsQuery, columnSpec);
      sqlParts.orderClauses = sqlParts.orderClauses.concat(orderFields);
    }
  };
};


// The orderFields parameter specifies a list of fieldMap the result is ordered by,
// if the rank is equal.
exports.autocomplete = function(columnSpec, orderFields) {
  orderFields = orderFields || [];
  return function(sqlParts, params) {
    if(notNull(params.autocomplete)) {
      var tsQuery = toPgSuggestQuery(params.autocomplete);
      applyTsQuery(sqlParts, params, tsQuery, columnSpec);
      sqlParts.orderClauses = sqlParts.orderClauses.concat(orderFields);
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

exports.paging = function(columnSpec, key, alwaysOrderByKey) {
  return function(sqlParts, params) {
    var offsetLimit = toOffsetLimit(params);
    _.extend(sqlParts, offsetLimit);
    if(params.per_side || alwaysOrderByKey) {
      applyOrderByKey(sqlParts, key );
    }
  };
};

// Transform a JSON polygon parameter to a WKT
function polygonTransformer(paramValue){
  var mapPoint   = function(point) { return ""+point[0]+" "+point[1]; };
  var mapPoints  = function(points) { return "("+_.map(points, mapPoint).join(", ")+")"; };
  var mapPolygon = function(poly) { return "POLYGON("+_.map(poly, mapPoints).join(" ")+")"; };
  return mapPolygon(paramValue);
}

// Generates WHERE clauses for whether the queried object is inside a given geometric shape
// Supported shapes are a poloygon or a circle.
exports.geomWithin = function(geom) {
  geom = geom || 'geom';
  return function(sqlParts, params) {
    var srid = params.srid || 4326;
    var sridAlias;
    if(params.polygon || params.cirkel) {
      sridAlias = dbapi.addSqlParameter(sqlParts, srid);
    }
    if(params.polygon) {
      var polygonAlias = dbapi.addSqlParameter(sqlParts, polygonTransformer(params.polygon));
      dbapi.addWhereClause(sqlParts, "ST_Intersects(ST_Transform(ST_GeomFromText("+ polygonAlias +", " + sridAlias + "), 25832), " + geom + ")");
    }
    if(params.cirkel) {
      var args = params.cirkel.split(',');
      var x = parseFloat(args[0]);
      var y = parseFloat(args[1]);
      var r = parseFloat(args[2]);
      var point = "POINT(" + x + " " + y + ")";
      var pointAlias = dbapi.addSqlParameter(sqlParts, point);
      var radiusAlias = dbapi.addSqlParameter(sqlParts, r);
      dbapi.addWhereClause(sqlParts, "ST_DWithin(" + geom + ", ST_Transform(ST_GeomFromText(" + pointAlias + ","+sridAlias + "), 25832), " + radiusAlias + ")");
    }
  };
};

// Adds an ORDER BY clause which returns the object closest to the specified X- and Y parameters.
// Sets limit to 1.
exports.reverseGeocoding = function() {
  return function(sqlParts, params) {
    if(notNull(params.x) && notNull(params.y)) {
      if (!params.srid){ params.srid = 4326;}
      var orderby =
        "geom <-> ST_Transform(ST_SetSRID(ST_Point(" +
          dbapi.addSqlParameter(sqlParts, params.x)+", " +
          dbapi.addSqlParameter(sqlParts, params.y)+"), " +
          dbapi.addSqlParameter(sqlParts, params.srid)+"), 25832)::geometry";
      sqlParts.orderClauses.push(orderby);
      sqlParts.limit = "1";
    }
  };
};

// Adds a where clause which requires the queried object to contain the point specified by the x and y parameters
exports.reverseGeocodingWithin = function(geom) {
  geom = geom || 'geom';
  return function(sqlParts, params) {
    if(notNull(params.x) && notNull(params.y)) {
      if (!params.srid){ params.srid = 4326;}
      var xAlias = dbapi.addSqlParameter(sqlParts, params.x);
      var yAlias = dbapi.addSqlParameter(sqlParts, params.y);
      dbapi.addWhereClause(sqlParts, "ST_Contains(" + geom + ", ST_Transform(ST_SetSRID(ST_Point(" +
        xAlias+", " +
        yAlias+"), " +
        dbapi.addSqlParameter(sqlParts, params.srid)+"), 25832))");
    }
  };
};

exports.postnummerStormodtagerFilter = function() {
  return function(sqlParts, params) {
    if(params.stormodtagere !== undefined && !params.stormodtagere) {
      dbapi.addWhereClause(sqlParts, 'NOT stormodtager');
    }
  };
};

var tilknytningKeyNames = _.reduce(tilknytninger, function(memo, tilknytning, temaName) {
  if(tilknytning.filterable) {
    memo[temaName] = tilknytning.keyFieldNames;
  }
  return memo;
}, {});
var temaKeys = _.reduce(dagiTemaer, function(memo, tema){
  memo[tema.singular] = tema.key;
  return memo;
}, {});

var tilknytningKeyToTemaKey = _.reduce(tilknytningKeyNames, function(memo, tilknytningNames, temaName) {
  memo[temaName] = _.reduce(tilknytningNames, function(memo, tilknytningName, index) {
    memo[tilknytningName] = temaKeys[temaName][index];
    return memo;
  }, {});
  return memo;
}, {});

exports.dagiFilter = function() {
  return function(sqlParts, params) {
    _.each(tilknytningKeyNames, function(tilknytningKeyName, temaName) {

      // paramValues maps each key name to a list values supplied
      var paramValues = _.reduce(tilknytningKeyName, function(memo, keyNamePart) {
        if(params[keyNamePart]) {
          memo[keyNamePart] = params[keyNamePart].values;
        }
        return memo;
      }, {});

      if(_.isEmpty(paramValues)) {
        // no parameters supplied for this tema
        return;
      }

      // list of parameters where the query requires the tema to be absent
      var absentKeys = [];
      // list of parameters where the query requires at least one of the values in the array
      var presentKeys = {};
      _.each(paramValues, function(paramValue, keyNamePart) {
        if(paramValue) {
          if(paramValue.length === 1 && paramValue[0] === null) {
            absentKeys.push(keyNamePart);
          }
          else {
            presentKeys[keyNamePart] = paramValue;
          }
        }
      });

      var temaAlias = dbapi.addSqlParameter(sqlParts, temaName);

      if(absentKeys.length !== 0) {
        // it does not matter which part of the key that is not present
        dbapi.addWhereClause(sqlParts, "NOT EXISTS( SELECT * FROM adgangsadresser_temaer_matview" +
        " WHERE  adgangsadresser_temaer_matview.tema = " + temaAlias +
        " AND adgangsadresse_id = a_id)");
      }
      else {
        var temaClauses = _.map(presentKeys, function(keyValues, tilknytningKeyName) {
          var valueAliases = _.map(keyValues, function(param) {
            return dbapi.addSqlParameter(sqlParts, param);
          });
          var temaKey = tilknytningKeyToTemaKey[temaName][tilknytningKeyName];
          var temaKeyName = temaKey.name;
          var temaKeyType = temaKey.sqlType;
          return "(temaer.fields->>'" + temaKeyName + "')::" + temaKeyType + " IN (" + valueAliases.join(', ') + ")";
        }).join(' AND ');
        var temaQuery = 'SELECT id FROM temaer WHERE tema = ' + temaAlias + ' AND ' + temaClauses;
        var sql = "EXISTS(WITH T AS (" + temaQuery + ") SELECT * FROM adgangsadresser_temaer_matview " +
        "JOIN temaer ON (tema_id = temaer.id AND temaer.tema = " + temaAlias + ')' +
        " WHERE adgangsadresser_temaer_matview.tema = " + temaAlias +
          " AND adgangsadresse_id = a_id" +
          " AND adgangsadresser_temaer_matview.tema_id IN (SELECT * FROM T))";
        dbapi.addWhereClause(sqlParts, sql);
      }

    });
  };
};
