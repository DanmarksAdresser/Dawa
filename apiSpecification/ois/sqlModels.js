"use strict";

var _ = require('underscore');

var propertyParameters = require('./oisPropertyParameters');
var oisApiFacts = require('./oisApiFacts');
var oisXmlFacts = require('./oisXmlFacts');
var registry = require('../registry');
var sqlParameterImpl = require('../common/sql/sqlParameterImpl');
var sqlUtil = require('../common/sql/sqlUtil');

var assembleSqlModel = sqlUtil.assembleSqlModel;
var selectIsoTimestamp = sqlUtil.selectIsoDate;

module.exports = Object.keys(oisApiFacts).reduce(function(memo, entityName) {
  var apiFacts = oisApiFacts[entityName];
  var xmlFacts = oisXmlFacts[entityName];

  var baseQuery = function() {
    return {
      select: [],
      from: [apiFacts.table],
      whereClauses: [],
      orderClauses: apiFacts.key,
      sqlParams: []
    };
  };

  var columns = xmlFacts.fields.reduce(function(memo, field) {
    if(!field.dawaName) {
      return memo;
    }
    var column = {
    };
    if(field.type === 'timestamp') {
      column.select = selectIsoTimestamp(field.name);
    }
    else {
      column.column = field.name;
    }
    memo[field.dawaName] = column;
    return memo;
  });
  var parameterImpls =   [
    sqlParameterImpl.simplePropertyFilter(propertyParameters[entityName], columns),
    sqlParameterImpl.paging(columns, apiFacts.key)
  ];

  memo[entityName] = assembleSqlModel(columns, parameterImpls, baseQuery);
  return memo;
}, {});

_.each(module.exports, function(sqlModel, entityName) {
  registry.add(entityName, 'sqlModel', undefined, sqlModel);
});
