"use strict";

var _ = require('underscore');

var temaer = require('./temaer');
var namesAndKeys = require('./namesAndKeys');
var sqlParameterImpl = require('../common/sql/sqlParameterImpl');
var parameters = require('./parameters');
var sqlUtil = require('../common/sql/sqlUtil');
var assembleSqlModel = sqlUtil.assembleSqlModel;
var selectIsoTimestampUtc = sqlUtil.selectIsoDateUtc;
var dbapi = require('../../dbapi');
var registry = require('../registry');
var additionalFields = require('./additionalFields');
const postgisSqlUtil = require('../common/sql/postgisSqlUtil');

var publishedTemaer = _.filter(temaer, function(tema) {
  return tema.published;
});

var casts = {
  jordstykke: {
    ejerlavkode: 'integer'
  }
};

publishedTemaer.forEach(function(tema) {
  var jsonFields = additionalFields[tema.singular];
  var columns = jsonFields.reduce(function(memo, fieldSpec) {
    var column = "(fields->>'" + fieldSpec.name + "')";
    if (casts[tema.singular] && casts[tema.singular][fieldSpec.name]) {
      column = '(' + column + '::' + casts[tema.singular][fieldSpec.name] + ')';
    }
    memo[fieldSpec.name] = {
      column: column
    };
    return memo;
  }, {});
  columns.geom_json = {
    select: function(sqlParts, sqlModel, params) {
      var sridAlias = dbapi.addSqlParameter(sqlParts, params.srid || 4326);
      return postgisSqlUtil.geojsonColumn(params.srid || 4326, sridAlias);
    }
  };

  columns.ændret = {
    column: selectIsoTimestampUtc('aendret')
  };

  columns.geo_ændret = {
    select: selectIsoTimestampUtc('geo_aendret')
  };

  var baseQuery = function() {
    return {
      select: [],
      from: ['temaer'],
      whereClauses: ['tema = $1 AND slettet IS NULL'],
      orderClauses: [],
      sqlParams: [tema.singular]
    };
  };

  var parameterImpls = [
    sqlParameterImpl.simplePropertyFilter(parameters[tema.singular].propertyFilter, columns),
    sqlParameterImpl.reverseGeocodingWithinTema(tema.singular),
    sqlParameterImpl.geomWithin(),
    sqlParameterImpl.search(columns),
    sqlParameterImpl.autocomplete(columns),
    sqlParameterImpl.paging(columns, namesAndKeys[tema.singular].key, true)
  ];

  exports[tema.singular] = assembleSqlModel(columns, parameterImpls, baseQuery);

  registry.add(tema.singular, 'sqlModel', undefined, exports[tema.singular]);
});
