"use strict";

var nameAndKey = require('./nameAndKey');
var sqlParameterImpl = require('../common/sql/sqlParameterImpl');
var parameters = require('./parameters');
var assembleSqlModel = require('../common/sql/sqlUtil').assembleSqlModel;
var dbapi = require('../../dbapi');

var columns = {
  nr: {
    select: 'p.nr',
    where: 'm.postnr'
  },
  navn: {
    select: 'p.navn'
  },
  version: {
    select: 'p.version',
    where: 'p.version'
  },
  kommune: {
    select: null,
    where: 'n.kommunekode'
  },
  geom_json: {
    select: function (sqlParts, sqlModel, params) {
      var sridAlias = dbapi.addSqlParameter(sqlParts, params.srid || 4326);
      return 'ST_AsGeoJSON(ST_Transform(dagi.geom,' + sridAlias + '))';
    }
  },
  kommuner: {
    select: 'json_agg(DISTINCT CAST((k.kode, k.navn) AS KommuneRef))'
  },
  tsv: {
    select: null,
    where: 'p.tsv'
  }
};

var baseQuery = function () {
  return {
    select: [],
    from: ['PostnumreKommunekoderMat m ' +
      'LEFT JOIN PostnumreKommunekoderMat n ON m.postnr = n.postnr ' +
      'LEFT JOIN postnumre p ON p.nr = m.postnr ' +
      " LEFT JOIN DagiTemaer k ON k.tema = 'kommune' AND m.kommunekode = k.kode",
      " LEFT JOIN DagiTemaer dagi ON dagi.tema = 'postdistrikt' AND dagi.kode = m.postnr"],
    whereClauses: [],
    groupBy: 'p.nr, p.navn, p.version, dagi.tema, dagi.kode',
    orderClauses: [],
    sqlParams: []
  };
};

var parameterImpls = [
  sqlParameterImpl.simplePropertyFilter(parameters.propertyFilter, columns),
  sqlParameterImpl.search(columns),
  sqlParameterImpl.autocomplete(columns),
  sqlParameterImpl.paging(columns, nameAndKey.key)
];

module.exports = assembleSqlModel(columns, parameterImpls, baseQuery);

var registry = require('../registry');
registry.add('postnummer', 'sqlModel', undefined, module.exports);