"use strict";

var adgangsadresseColumns = require('../adgangsadresse/columns');
var dbapi = require('../../dbapi');
var nameAndKey = require('./nameAndKey');
var parameters = require('./parameters');
var sqlParameterImpl = require('../common/sql/sqlParameterImpl');
var sqlUtil = require('../common/sql/sqlUtil');
var util = require('../util');


var assembleSqlModel = sqlUtil.assembleSqlModel;
var notNull = util.notNull;
var selectIsoTimestamp = sqlUtil.selectIsoDate;

var columns = {
  id: {
    column: 'e_id'
  },
  status: {
    column: 'e_objekttype'
  },
  oprettet: {
    select: selectIsoTimestamp('e_oprettet')
  },
  ændret:{
    select: selectIsoTimestamp('e_aendret')
  },
  ikrafttrædelse: {
    select: selectIsoTimestamp('e_ikraftfra')
  },
  adgangsadresseid: {
    column: 'a_id'
  },
  husnr: sqlUtil.husnrColumn,
  dør: {
    column: 'doer'
  },
  tsv: {
    column: 'e_tsv'
  },
  etrs89koordinat_øst: {
    column: 'oest'
  },
  etrs89koordinat_nord: {
    column: 'nord'
  },
  højde: {
    column: 'hoejde'
  },
  wgs84koordinat_bredde: adgangsadresseColumns.wgs84koordinat_bredde,
  wgs84koordinat_længde: adgangsadresseColumns.wgs84koordinat_længde,
  nøjagtighed: {
    column: 'noejagtighed'
  },
  adressepunktændringsdato: {
    select: selectIsoTimestamp('adressepunktaendringsdato')
  },
  geom_json: adgangsadresseColumns.geom_json,
  adgangsadresse_status: {
    column: 'a_objekttype'
  },
  adgangsadresse_oprettet: {
    select: selectIsoTimestamp('a_oprettet')
  },
  adgangsadresse_ændret: {
    select: selectIsoTimestamp('a_aendret')
  },
  adgangsadresse_ikrafttrædelse: {
    select: selectIsoTimestamp('a_ikraftfra')
  },
  bebyggelsesid: adgangsadresseColumns.bebyggelsesid,
  bebyggelsestype: adgangsadresseColumns.bebyggelsestype

};

var baseQuery = function () {
  return {
    select: [],
    from: ['Adresser'],
    whereClauses: [],
    orderClauses: [],
    sqlParams: []
  };
};

function addAdditionalAdresseOrdering(sqlParts, rawQuery) {
// we order according to levenshtein distance when the addresses have same rank.
  // This improves ordering of addresses with identical rank, especially if
  // several addresses matches 100%.
  var rawQueryAlias = dbapi.addSqlParameter(sqlParts, rawQuery);
  sqlParts.orderClauses.push("levenshtein(adressebetegnelse(vejnavn, husnr, etage, dør, supplerendebynavn, postnr::varchar, postnrnavn), " + rawQueryAlias + ") ASC");
  sqlParts.orderClauses.push('husnr');
  sqlParts.orderClauses.push('etage');
  sqlParts.orderClauses.push('dør');
}
var searchAdresse = function(columnSpec) {
  var searchFn = sqlParameterImpl.search(columnSpec);
  return function(sqlParts, params) {
    if(notNull(params.search)) {
      searchFn(sqlParts, params);
      addAdditionalAdresseOrdering(sqlParts, params.search);
    }
  };
};

var autocompleteAdresse = function(columnSpec) {
  var autocompleteFn = sqlParameterImpl.autocomplete(columnSpec);
  return function(sqlParts, params) {
    if(notNull(params.autocomplete)) {
      autocompleteFn(sqlParts, params);
      addAdditionalAdresseOrdering(sqlParts, params.autocomplete);
    }
  };
};

function fuzzySearchParameterImpl(sqlParts, params) {
  if(params.fuzzyq) {
    var fuzzyqAlias = dbapi.addSqlParameter(sqlParts, params.fuzzyq);
    sqlParts.whereClauses.push("adresser.a_id IN " +
      "(SELECT id" +
      " FROM adgangsadresser adg" +
      " JOIN (select kommunekode, vejkode, postnr" +
      " FROM vejstykkerpostnumremat vp" +
      " ORDER BY tekst <-> " + fuzzyqAlias + " limit 15) as vp" +
      " ON adg.kommunekode = vp.kommunekode AND adg.vejkode = vp.vejkode AND adg.postnr = vp.postnr)");
    sqlParts.orderClauses.push("least(levenshtein(lower(adressebetegnelse(vejnavn, husnr, etage, doer, NULL," +
      " to_char(adresser.postnr, 'FM0000'), postnrnavn)), lower(" + fuzzyqAlias + "), 2, 1, 3)," +
      " levenshtein(lower(adressebetegnelse(vejnavn, husnr, etage, doer, supplerendebynavn, to_char(adresser.postnr," +
      " 'FM0000'), postnrnavn)), lower(" + fuzzyqAlias + "), 2, 1, 3))");
  }
}

// WARNING: order matters!
var parameterImpls = [
  sqlParameterImpl.simplePropertyFilter(parameters.propertyFilter, columns),
  sqlParameterImpl.husnrInterval(),
  sqlParameterImpl.geomWithin(),
  sqlParameterImpl.dagiFilter(),
  sqlParameterImpl.jordstykkeFilter(),
  searchAdresse(columns),
  autocompleteAdresse(columns),
  fuzzySearchParameterImpl,
  sqlParameterImpl.paging(columns, nameAndKey.key)
];

module.exports = sqlUtil.applyFallbackToFuzzySearch(assembleSqlModel(columns, parameterImpls, baseQuery));

var registry = require('../registry');
registry.add('adresse', 'sqlModel', undefined, module.exports);
