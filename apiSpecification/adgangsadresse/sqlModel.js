"use strict";

var columns = require('./columns');
var nameAndKey = require('./nameAndKey');
var parameters = require('./parameters');
var sqlParameterImpl = require('../common/sql/sqlParameterImpl');
var sqlUtil = require('../common/sql/sqlUtil');

var assembleSqlModel = sqlUtil.assembleSqlModel;

var baseQuery = function () {
  return {
    select: [],
    from: ['AdgangsadresserView'],
    whereClauses: [],
    orderClauses: [],
    sqlParams: []
  };
};

var parameterImpls = [
  sqlParameterImpl.simplePropertyFilter(parameters.propertyFilter, columns),
  sqlParameterImpl.geomWithin(),
  sqlParameterImpl.reverseGeocoding(),
  sqlParameterImpl.dagiFilter(),
  sqlParameterImpl.search(columns),
  sqlParameterImpl.autocomplete(columns, ['husnr']),
  sqlParameterImpl.paging(columns, nameAndKey.key)
];

module.exports = assembleSqlModel(columns, parameterImpls, baseQuery);

var registry = require('../registry');
registry.add('adgangsadresse', 'sqlModel', undefined, module.exports);