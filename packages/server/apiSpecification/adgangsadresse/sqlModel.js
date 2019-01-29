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
    with: [],
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

function fuzzySearchParameterImpl(sqlParts, params) {
  if(params.fuzzyq) {
    var fuzzyqAlias = dbapi.addSqlParameter(sqlParts, params.fuzzyq);
    sqlParts.with.push(`adgadr_ids AS (SELECT id
       FROM adgangsadresser adg
       JOIN (select kommunekode, vejkode, postnr
       FROM vejstykkerpostnumremat vp
       ORDER BY tekst <-> ${fuzzyqAlias} limit 15) as vp
       ON adg.kommunekode = vp.kommunekode AND adg.vejkode = vp.vejkode AND adg.postnr = vp.postnr)`);
    sqlParts.whereClauses.push("a_id IN (select * from adgadr_ids)");
    sqlParts.orderClauses.push("least(levenshtein(lower(adressebetegnelse(vejnavn, husnr, NULL, NULL, NULL," +
      " to_char(adgangsadresserview.postnr, 'FM0000'), postnrnavn)), lower(" + fuzzyqAlias + "), 2, 1, 3)," +
      " levenshtein(lower(adressebetegnelse(vejnavn, husnr, NULL, NULL, supplerendebynavn, to_char(adgangsadresserview.postnr," +
      " 'FM0000'), postnrnavn)), lower(" + fuzzyqAlias + "), 2, 1, 3))");
    sqlParts.orderClauses.push('husnr');
  }
}


var parameterImpls = [
  sqlParameterImpl.includeInvalidAdgangsadresser,
  sqlParameterImpl.includeDeletedAdgangsAdresses,
  sqlParameterImpl.simplePropertyFilter(parameters.propertyFilter, columns),
  sqlParameterImpl.husnrInterval(),
  sqlParameterImpl.adgangsadresseGeoFilter,
  searchAdgangsadresse(columns),
  autocompleteAdgangsadresse(columns),
  fuzzySearchParameterImpl,
  sqlParameterImpl.paging(columns, nameAndKey.key)
];

module.exports = sqlUtil.applyFallbackToFuzzySearch(assembleSqlModel(columns, parameterImpls, baseQuery));

var registry = require('../registry');
registry.add('adgangsadresse', 'sqlModel', undefined, module.exports);
