"use strict";

var nameAndKey = require('./nameAndKey');
var sqlParameterImpl = require('../common/sql/sqlParameterImpl');
var assembleSqlModel = require('../common/sql/sqlUtil').assembleSqlModel;
const parameters = require('./parameters');

var columns = {
  undertyper: {
    select: 'json_agg(undertype)'
  }
};

var baseQuery = function () {
  return {
    select: [],
    from: ['stednavntyper'],
    whereClauses: [],
    orderClauses: [],
    groupBy: ['hovedtype'],
    sqlParams: []
  };
};


var parameterImpls = [
  sqlParameterImpl.simplePropertyFilter(parameters.propertyFilter, columns),
  sqlParameterImpl.paging(columns, nameAndKey.key, true)
];

module.exports = assembleSqlModel(columns, parameterImpls, baseQuery);

var registry = require('../registry');
registry.add('stednavntype', 'sqlModel', undefined, module.exports);
