"use strict";

var _ = require('underscore');

var sqlUtil = require('./sqlUtil');
var dbapi = require('../../../dbapi');
var util = require('../../util');

var notNull = util.notNull;

var dagiTemaer = require('../../dagitemaer/dagiTemaer');

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
  return "(" + columnName + " @@ to_tsquery('adresser', " + paramAlias + "))";
}

function searchOrderClause(paramAlias, columnSpec) {
  var columnName = getSearchColumn(columnSpec);
  return 'ts_rank(' + columnName + ", to_tsquery('adresser'," + paramAlias + ')) DESC';
}


/*
 * Adds a simple equality where clause. Supports multi parameters.
 */
exports.simplePropertyFilter = function(parameterSpec, columnSpec) {
  return function(sqlParts, params) {
    parameterSpec.forEach(function (parameter) {
      var name = parameter.name;
      var value = params[name];

      if (value !== undefined)
      {
        if (value._multi_ === undefined)
        {
          if (name === 'stormodtagere' && value === "true")
          {
            // when stormodtagere is true both normal and
            // stormodtager postnumbers should be returned -- no
            // where clause.
            return;
          }
          var parameterAlias = dbapi.addSqlParameter(sqlParts, value);
          var column = sqlUtil.getColumnNameForWhere(columnSpec, name);
          sqlParts.whereClauses.push(column + " = " + parameterAlias);
        }
        else
        {
          var orClauses = _.map(value.values,
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

function polygonTransformer(paramValue){
  var mapPoint   = function(point) { return ""+point[0]+" "+point[1]; };
  var mapPoints  = function(points) { return "("+_.map(points, mapPoint).join(", ")+")"; };
  var mapPolygon = function(poly) { return "POLYGON("+_.map(poly, mapPoints).join(" ")+")"; };
  return mapPolygon(paramValue);
}

exports.geomWithin = function() {
  return function(sqlParts, params) {
    var srid = params.srid || 4326;
    var sridAlias;
    if(params.polygon || params.cirkel) {
      sridAlias = dbapi.addSqlParameter(sqlParts, srid);
    }
    if(params.polygon) {
      var polygonAlias = dbapi.addSqlParameter(sqlParts, polygonTransformer(params.polygon));
      dbapi.addWhereClause(sqlParts, "ST_Contains(ST_Transform(ST_GeomFromText("+ polygonAlias +", " + sridAlias + "), 25832), geom)");
    }
    if(params.cirkel) {
      var args = params.cirkel.split(',');
      var x = parseFloat(args[0]);
      var y = parseFloat(args[1]);
      var r = parseFloat(args[2]);
      var point = "POINT(" + x + " " + y + ")";
      var pointAlias = dbapi.addSqlParameter(sqlParts, point);
      var radiusAlias = dbapi.addSqlParameter(sqlParts, r);
      dbapi.addWhereClause(sqlParts, "ST_DWithin(geom, ST_Transform(ST_GeomFromText(" + pointAlias + ","+sridAlias + "), 25832), " + radiusAlias + ")");
    }
  };
};

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

var filterableDagiSkemaer = ['region', 'opstillingskreds', 'politikreds', 'sogn', 'retskreds'];
var dagiTemaMap = _.indexBy(dagiTemaer, 'singular');

exports.dagiFilter = function() {
  return function(sqlParts, params) {
    filterableDagiSkemaer.forEach(function(skemaNavn) {
      var paramArray = params[dagiTemaMap[skemaNavn].prefix + 'kode'];
      if(notNull(paramArray)) {
        var temaAlias = dbapi.addSqlParameter(sqlParts, skemaNavn);
        var kodeAliases = _.map(paramArray, function(param) {
          return dbapi.addSqlParameter(sqlParts, param);
        });
        dbapi.addWhereClause(sqlParts, 'EXISTS( SELECT * FROM AdgangsadresserDagiRel WHERE dagikode IN (' + kodeAliases.join(', ') + ') AND dagitema = ' + temaAlias + ' AND adgangsadresseid = a_id)');
      }
    });
  };
};
