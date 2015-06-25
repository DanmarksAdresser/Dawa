"use strict";

var _ = require('underscore');

var oisApiFacts = require('./oisApiFacts');
var oisXmlFacts = require('./oisXmlFacts');
var registry = require('../registry');
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
    var column = {
    };
    if(field.type === 'timestamp') {
      column.select = selectIsoTimestamp(field.name);
    }
    else {
      column.column = field.name;
    }
    memo[field.name] = column;
    return memo;
  });
  memo[entityName] = assembleSqlModel(columns, [], baseQuery);
  return memo;
}, {});

_.each(module.exports, function(sqlModel, entityName) {
  registry.add(entityName, 'sqlModel', undefined, sqlModel);
});
