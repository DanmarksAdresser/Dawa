"use strict";

var adgangsadresseColumns = require('../adgangsadresse/columns');
var dbapi = require('../../dbapi');
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
    select: 'dar1_status_til_dawa_status(e_status)',
    where: (sqlParts, bbrStatus) => {
      const alias = dbapi.addSqlParameter(sqlParts, util.bbrStatusTilDar(bbrStatus));
      dbapi.addWhereClause(sqlParts,`e_status = ${alias}`);
    }
  },
  darstatus: {
    column: 'e_status'
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
  nedlagt: {
    select: selectIsoTimestamp('e_nedlagt')
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
  adgangsadresse_oprettet: {
    select: selectIsoTimestamp('a_oprettet')
  },
  adgangsadresse_ændret: {
    select: selectIsoTimestamp('a_aendret')
  },
  adgangsadresse_ikrafttrædelse: {
    select: selectIsoTimestamp('a_ikraftfra')
  },
  adgangsadresse_nedlagt: {
    select: selectIsoTimestamp('a_nedlagt')
  },
  stedid: adgangsadresseColumns.stedid,
  bebyggelsesid: adgangsadresseColumns.bebyggelsesid,
  bebyggelsestype: adgangsadresseColumns.bebyggelsestype,
  x: adgangsadresseColumns.x,
  y: adgangsadresseColumns.y,
  vejpunkt_x: adgangsadresseColumns.vejpunkt_x,
  vejpunkt_y: adgangsadresseColumns.vejpunkt_y,
  vejpunkt_nøjagtighed: adgangsadresseColumns.vejpunkt_nøjagtighed,
  adgangspunkt_geom_json: adgangsadresseColumns.adgangspunkt_geom_json,
  vejpunkt_geom_json: adgangsadresseColumns.vejpunkt_geom_json,
  geom_json: adgangsadresseColumns.geom_json,
  ejerlavkode: adgangsadresseColumns.ejerlavkode,
  ejerlavnavn: adgangsadresseColumns.ejerlavnavn,
  matrikelnr: adgangsadresseColumns.matrikelnr,
  esrejendomsnr: adgangsadresseColumns.esrejendomsnr,
  zone: adgangsadresseColumns.zone,
  adgangsadresse_status: {
    select: 'dar1_status_til_dawa_status(a_status)'
  },
  adgangsadresse_darstatus: {
    column: 'a_status'
  }

};

var baseQuery = function () {
  return {
    with: [],
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
  return(sqlParts, params) => {
    if(notNull(params.q)) {
      sqlParameterImpl.twoStepSearch(columnSpec, 'e_id')(sqlParts, params);
      addAdditionalAdresseOrdering(sqlParts, params.q);
    }
  };
};

const postnrRegex = /\d{4}/g;
function fuzzySearchParameterImpl(sqlParts, params) {
  if(params.fuzzyq) {
    // we add a postnr clause to the query for performance reasons when there is exactly one 4-digit number in the address text
    const postnrMatches = params.fuzzyq.match(postnrRegex);
    const postnrClause = (postnrMatches && postnrMatches.length === 1) ? `WHERE postnr = ${postnrMatches[0]} OR ${postnrMatches[0]} NOT IN (select nr from vask_postnumre)` : '';
    var fuzzyqAlias = dbapi.addSqlParameter(sqlParts, params.fuzzyq);
    sqlParts.with.push(`adgadr_ids AS (SELECT id
       FROM adgangsadresser_mat adg
       JOIN (select kommunekode, vejkode, postnr
       FROM vejstykkerpostnumremat vp
       ${postnrClause}
       ORDER BY tekst <-> ${fuzzyqAlias} limit 15) as vp
       ON adg.kommunekode = vp.kommunekode AND adg.vejkode = vp.vejkode AND adg.postnr = vp.postnr)`);
    sqlParts.whereClauses.push("adresser.a_id IN (select * from adgadr_ids)");
    sqlParts.orderClauses.push("least(levenshtein(lower(adressebetegnelse(vejnavn, husnr, etage, doer, NULL," +
      " to_char(adresser.postnr, 'FM0000'), postnrnavn)), lower(" + fuzzyqAlias + "), 2, 1, 3)," +
      " levenshtein(lower(adressebetegnelse(vejnavn, husnr, etage, doer, supplerendebynavn, to_char(adresser.postnr," +
      " 'FM0000'), postnrnavn)), lower(" + fuzzyqAlias + "), 2, 1, 3))");
    sqlParts.orderClauses.push('husnr');
  }
}

// WARNING: order matters!
var parameterImpls = [
  sqlParameterImpl.includeInvalidAdgangsadresser,
  sqlParameterImpl.includeDeletedAdresses,
  sqlParameterImpl.simplePropertyFilter(parameters.propertyFilter, columns),
  sqlParameterImpl.husnrInterval(),
  sqlParameterImpl.adgangsadresseGeoFilter,
  searchAdresse(columns),
  fuzzySearchParameterImpl,
  sqlParameterImpl.paging(columns,['id'])
];

module.exports = sqlUtil.applyFallbackToFuzzySearch(assembleSqlModel(columns, parameterImpls, baseQuery));

var registry = require('../registry');
registry.add('adresse', 'sqlModel', undefined, module.exports);
