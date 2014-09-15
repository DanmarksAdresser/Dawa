"use strict";

var _ = require('underscore');

var temaer = require('./temaer');
var namesAndKeys = require('./namesAndKeys');
var sqlParameterImpl = require('../common/sql/sqlParameterImpl');
var parameters = require('./parameters');
var assembleSqlModel = require('../common/sql/sqlUtil').assembleSqlModel;
var dbapi = require('../../dbapi');
var registry = require('../registry');
var fields = require('./fields');

var jsonFieldMap = _.reduce(fields, function(memo, temaFields, temaNavn) {
  memo[temaNavn] = _.filter(temaFields, function(field) {
    return field.name !== 'geom_json';
  });
  return memo;
}, {});

var publishedTemaer = _.filter(temaer, function(tema) {
  return tema.published;
});

publishedTemaer.forEach(function(tema) {
  var jsonFields = jsonFieldMap[tema.singular];
  var columns = jsonFields.reduce(function(memo, fieldSpec) {
    memo[fieldSpec.name] = {
      column: "fields->>'" + fieldSpec.name + "'"
    };
    return memo;
  }, {});
  columns.geom_json = {
    select: function(sqlParts, sqlModel, params) {
      var sridAlias = dbapi.addSqlParameter(sqlParts, params.srid || 4326);
      return 'ST_AsGeoJSON(ST_Transform(geom,' + sridAlias + '))';
    }
  };

  var baseQuery = function() {
    return {
      select: [],
      from: ['temaer'],
      whereClauses: ['tema = $1'],
      orderClauses: [],
      sqlParams: [tema.singular]
    };
  };

  var parameterImpls = [
    sqlParameterImpl.simplePropertyFilter(parameters.propertyFilter, columns),
    sqlParameterImpl.reverseGeocodingWithin(),
    sqlParameterImpl.search(columns),
    sqlParameterImpl.autocomplete(columns),
    sqlParameterImpl.paging(columns, namesAndKeys[tema.singular].key)
  ];

  exports[tema.singular] = assembleSqlModel(columns, parameterImpls, baseQuery);

  registry.add(tema.singular, 'sqlModel', undefined, exports[tema.singular]);
});
