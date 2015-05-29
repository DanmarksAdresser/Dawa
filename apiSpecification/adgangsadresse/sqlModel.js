"use strict";

var columns = require('./columns');
var dbapi = require('../../dbapi');
var nameAndKey = require('./nameAndKey');
var parameters = require('./parameters');
var sqlParameterImpl = require('../common/sql/sqlParameterImpl');
var sqlUtil = require('../common/sql/sqlUtil');
var util = require('../util');

var assembleSqlModel = sqlUtil.assembleSqlModel;
var notNull = util.notNull;

var baseQuery = function () {
  return {
    select: [],
    from: ['AdgangsadresserView'],
    whereClauses: [],
    orderClauses: [],
    sqlParams: []
  };
};

function addAdditionalAdgangsadresseOrdering(sqlParts, rawQuery) {
// we order according to levenshtein distance when the addresses have same rank.
  // This improves ordering of addresses with identical rank, especially if
  // several addresses matches 100%.
  var rawQueryAlias = dbapi.addSqlParameter(sqlParts, rawQuery);
  sqlParts.orderClauses.push("levenshtein(adressebetegnelse(vejnavn, husnr, NULL, NULL, supplerendebynavn, postnr::varchar, postnrnavn), " + rawQueryAlias + ") ASC");
  sqlParts.orderClauses.push('husnr');
}
var searchAdgangsadresse = function(columnSpec) {
  var searchFn = sqlParameterImpl.search(columnSpec);
  return function(sqlParts, params) {
    if(notNull(params.search)) {
      searchFn(sqlParts, params);
      addAdditionalAdgangsadresseOrdering(sqlParts, params.search);
    }
  };
};

var autocompleteAdgangsadresse = function(columnSpec) {
  var autocompleteFn = sqlParameterImpl.autocomplete(columnSpec);
  return function(sqlParts, params) {
    if(notNull(params.autocomplete)) {
      autocompleteFn(sqlParts, params);
      addAdditionalAdgangsadresseOrdering(sqlParts, params.autocomplete);
    }
  };
};

var parameterImpls = [
  sqlParameterImpl.simplePropertyFilter(parameters.propertyFilter, columns),
  sqlParameterImpl.geomWithin(),
  sqlParameterImpl.reverseGeocoding(),
  sqlParameterImpl.dagiFilter(),
  searchAdgangsadresse(columns),
  autocompleteAdgangsadresse(columns),
  sqlParameterImpl.paging(columns, nameAndKey.key)
];

module.exports = assembleSqlModel(columns, parameterImpls, baseQuery);

var registry = require('../registry');
registry.add('adgangsadresse', 'sqlModel', undefined, module.exports);