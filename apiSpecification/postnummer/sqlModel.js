"use strict";

var nameAndKey = require('./nameAndKey');
var sqlParameterImpl = require('../common/sql/sqlParameterImpl');
var parameters = require('./parameters');
var assembleSqlModel = require('../common/sql/sqlUtil').assembleSqlModel;
var dbapi = require('../../dbapi');

var columns = {
  nr: {
    select: 'p.nr',
    where: 'p.nr'
  },
  navn: {
    select: 'p.navn'
  },
  kommunekode: {
    select: null,
    where: 'n.kommunekode'
  },
  stormodtageradresser: {
    select: 'first(s.stormodtageradresser)',
  },
  stormodtagere: {
    where: 'p.stormodtager'
  },
  geom_json: {
    select: function (sqlParts, sqlModel, params) {
      var sridAlias = dbapi.addSqlParameter(sqlParts, params.srid || 4326);
      return 'ST_AsGeoJSON(ST_Transform(dagi.geom,' + sridAlias + '))';
    }
  },
  kommuner: {
    select: 'first(k.kommuner)'
  },
  tsv: {
    column: 'p.tsv'
  }
};

var baseQuery = function () {
  return {
    select: [],
    from: [''+
           'postnumre p '+
           'LEFT JOIN (SELECT s.nr AS nr, json_agg(s.adgangsadresseid) AS stormodtageradresser '+
           '           FROM stormodtagere s '+
           '           GROUP BY s.nr) s '+
           '  ON s.nr = p.nr '+
           'LEFT JOIN (SELECT m.postnr AS postnr, json_agg((m.kommunekode, d.navn)::kommuneRef ORDER BY m.kommunekode) AS kommuner '+
           '           FROM postnumre_kommunekoder_mat m '+
           '           LEFT JOIN dagitemaer d '+
           "             ON d.tema = 'kommune' AND d.kode = m.kommunekode "+
           '           GROUP BY m.postnr) k '+
           '  ON  k.postnr = p.nr '+
           'LEFT JOIN postnumre_kommunekoder_mat n ON n.postnr = p.nr '
          ],
    whereClauses: ["p.navn <> 'Ukendt' "],
    groupBy: 'p.nr, p.navn',
    orderClauses: ['p.nr'],
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
