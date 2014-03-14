"use strict";

var dagiTemaer = require('./dagiTemaer');
var namesAndKeys = require('./namesAndKeys');
var sqlParameterImpl = require('../common/sql/sqlParameterImpl');
var parameters = require('./parameters');
var assembleSqlModel = require('../common/sql/sqlUtil').assembleSqlModel;
var dbapi = require('../../dbapi');
var registry = require('../registry');

// no column mappings necessary for dagi temaer.
dagiTemaer.forEach(function(tema) {
  var columns =  {
    geom_json: {
      select: function(sqlParts, sqlModel, params) {
        var sridAlias = dbapi.addSqlParameter(sqlParts, params.srid || 4326);
        return 'ST_AsGeoJSON(ST_Transform(geom,' + sridAlias + '))';
      }
    }
  };

  var baseQuery = function() {
    return {
      select: [],
      from: ['DagiTemaer'],
      whereClauses: ['tema = $1'],
      orderClauses: [],
      sqlParams: [tema.singular]
    };
  };

  var parameterImpls = [
    sqlParameterImpl.simplePropertyFilter(parameters.propertyFilter, columns),
    sqlParameterImpl.search(columns),
    sqlParameterImpl.autocomplete(columns),
    sqlParameterImpl.paging(columns, namesAndKeys[tema.singular].key)
  ];

  exports[tema.singular] = assembleSqlModel(columns, parameterImpls, baseQuery);

  registry.add(tema.singular, 'sqlModel', undefined, exports[tema.singular]);
});
