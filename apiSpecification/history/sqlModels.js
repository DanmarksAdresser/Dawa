"use strict";

var columnsMap = require('./columns');
var parameters = require('./parameters');
var registry = require('../registry');
var sqlParameterImpl = require('../common/sql/sqlParameterImpl');
var sqlUtil = require('../common/sql/sqlUtil');

var assembleSqlModel = sqlUtil.assembleSqlModel;

['adgangsadresse', 'adresse'].forEach((entityName) => {
  var columns = columnsMap[entityName];
  var parameterImpls = [
    sqlParameterImpl.simplePropertyFilter(parameters.propertyFilter, columns),
    sqlParameterImpl.paging(columns, ['id', 'lower(virkning)'])];

  var baseQuery = function() {
    return {
      select: [],
      from: [`vask_${entityName}r`],
      whereClauses: [],
      groupBy: '',
      orderClauses: [],
      sqlParams: []
    };
  };

  exports[entityName] = assembleSqlModel(columns, parameterImpls, baseQuery);
  registry.add(`history_${entityName}`, 'sqlModel', undefined, module.exports);
});
