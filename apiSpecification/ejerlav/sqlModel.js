"use strict";

var nameAndKey = require('./nameAndKey');
var sqlParameterImpl = require('../common/sql/sqlParameterImpl');
var parameters = require('./parameters');
var sqlUtil = require('../common/sql/sqlUtil');
var assembleSqlModel = sqlUtil.assembleSqlModel;

var columns = {
  kode: {
    column: 'ejerlav.kode'
  },
  navn: {
    column: 'ejerlav.navn'
  }
};

var parameterImpls = [
  sqlParameterImpl.simplePropertyFilter(parameters.propertyFilter, columns),
  sqlParameterImpl.search(columns),
  sqlParameterImpl.autocomplete(columns, ['navn']),
  sqlParameterImpl.paging(columns, nameAndKey.key)
];

var baseQuery = function() {
  return {
    select: [],
    from: ['ejerlav'],
    whereClauses: [],
    groupBy: '',
    orderClauses: [],
    sqlParams: []
  };
};

module.exports = assembleSqlModel(columns, parameterImpls, baseQuery);

var registry = require('../registry');
registry.add('ejerlav', 'sqlModel', undefined, module.exports);