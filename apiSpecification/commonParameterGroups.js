"use strict";

var columns = require('./columns');
var columnsUtil = require('./columnsUtil');
var dbapi = require('../dbapi');
var namesAndKeys = require('./namesAndKeys');
var schema = require('./parameterSchema');
var util = require('./util');
var _ = require('underscore');

var notNull = util.notNull;

function getSearchColumn(columnSpec) {
  return columnsUtil.getColumnNameForWhere(columnSpec, 'tsv');
}

function searchWhereClause(paramNumberString, spec) {
  var columnSpec = columns[spec.model.name];
  var columnName = getSearchColumn(columnSpec);
  return "(" + columnName + " @@ to_tsquery('danish', " + paramNumberString + "))";
}

function endsWith(str, suffix) {
  return str.indexOf(suffix, str.length - suffix.length) !== -1;
}


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

function polygonTransformer(paramValue){
  var mapPoint   = function(point) { return ""+point[0]+" "+point[1]; };
  var mapPoints  = function(points) { return "("+_.map(points, mapPoint).join(", ")+")"; };
  var mapPolygon = function(poly) { return "POLYGON("+_.map(poly, mapPoints).join(" ")+")"; };
  return mapPolygon(paramValue);
}

/**
 * By default, if per_side is specified, side defaults to 1.
 * If side is specified, per_side defaults to 20.
 */
function applyDefaultPaging(pagingParams) {
  if(pagingParams.per_side && !pagingParams.side) {
    pagingParams.side = 1;
  }
  if(pagingParams.side && !pagingParams.per_side) {
    pagingParams.per_side = 20;
  }
}

exports.searchParameterSpec = {
  parameters: [
    {
      name: 'q',
      type: 'string'
    }
  ],
  applySql: function(sqlParts, params, spec) {
    if(notNull(params.q)) {
      var parameterAlias = dbapi.addSqlParameter(sqlParts, toPgSearchQuery(params.q));
      dbapi.addWhereClause(sqlParts, searchWhereClause(parameterAlias, spec));
    }
  }
};

exports.autocompleteParameterSpec = {
  parameters: [
    {
      name: 'q',
      type: 'string'
    }
  ],
  applySql: function(sqlParts, params, spec) {
    if(notNull(params.q)) {
      var parameterAlias = dbapi.addSqlParameter(sqlParts, toPgSuggestQuery(params.q));
      dbapi.addWhereClause(sqlParts, searchWhereClause(parameterAlias, spec));
    }
  }
};

exports.reverseGeocodingParameterSpec =
{parameters: [{name: 'x',    type: 'float'},
  {name: 'y',    type: 'float'}],

  applySql: function(sqlParts, params, spec) {
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

exports.crsParameterSpec = {
  parameters: [
    {
      name: 'srid',
      type: 'integer'
    }
  ]
};

exports.geomWithinParameterSpec = {
  parameters:[
    {
      name: 'polygon',
      type: 'json',
      schema: schema.polygon
    },
    {
      name: 'cirkel',
      type: 'string',
      schema:{
        type: 'string',
        pattern: '^((\\+|\\-)?[0-9]+(\\.[0-9]*)?),((\\+|\\-)?[0-9]+(\\.[0-9]*)?),((\\+|\\-)?[0-9]+(\\.[0-9]*)?)$'
      }
    }
  ],
  applySql: function(sqlParts, params, spec) {
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
  }
};

exports.pagingParameterSpec = {
  parameters: [
    {
      name: 'side',
      type: 'integer',
      schema: schema.positiveInteger
    },
    {
      name: 'per_side',
      type: 'integer',
      schema: schema.positiveInteger
    }
  ],
  applySql: function(sqlParts, params, spec) {
    applyDefaultPaging(params);
    var offsetLimit = toOffsetLimit(params);
    _.extend(sqlParts, offsetLimit);
    if(params.per_side) {
      applyOrderByKey(spec ,sqlParts);
    }
  }
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
function applyOrderByKey(spec, sqlParts) {
  var columnSpec = columns[spec.model.name];
  var keyArray = namesAndKeys[spec.model.name].key;
  keyArray.forEach(function (key) {
    sqlParts.orderClauses.push(columnsUtil.getColumnNameForSelect(columnSpec, key));
  });
}



exports.formatParameterSpec = {
  parameters: [
    {
      name: 'format',
      schema: {
        "enum": ['csv', 'json', 'geojson']
      }
    },
    {
      name: 'callback',
      schema: {
        type: 'string',
        pattern: '^[\\$_a-zA-Z0-9]+$'
      }
    }
  ]};
