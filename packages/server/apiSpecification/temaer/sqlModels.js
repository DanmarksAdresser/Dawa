"use strict";

const temaModels = require('../../dagiImport/temaModels');
const sqlParameterImpl = require('../common/sql/sqlParameterImpl');
const parameters = require('./parameters');
const sqlUtil = require('../common/sql/sqlUtil');
const assembleSqlModel = sqlUtil.assembleSqlModel;
const selectIsoTimestampUtc = sqlUtil.selectIsoDateUtc;
const dbapi = require('../../dbapi');
const registry = require('../registry');
const postgisSqlUtil = require('../common/sql/postgisSqlUtil');

const additionalColumnsMap = {
  afstemningsområde: {
    dagi_id: {
      column:'t.dagi_id'
    },
    nummer: {
      column: 't.nummer'
    },
    navn: {
      column: 't.navn'
    },
    afstemningsstednavn: {
      column: 't.afstemningsstednavn'
    },
    afstemningsstedadresseid: {
      column: 't.afstemningsstedadresse'
    },
    afstemningsstedadressebetegnelse: {
      select: `adressebetegnelse(vejnavn, husnr, null::text, null::text, supplerendebynavn, postnr::text, postnrnavn )`
    },
    kommunekode: {
      column: 'k.kode',
    },
    kommunenavn: {
      column: 'k.navn'
    },
    regionskode: {
      column: 'r.kode'
    },
    regionsnavn: {
      column: 'r.navn'
    },
    opstillingskredsnummer: {
      column: 'o.nummer'
    },
    opstillingskredsnavn: {
      column: 'o.navn'
    },
    storkredsnummer: {
      column: 's.nummer'
    },
    storkredsnavn: {
      column: 's.navn'
    },
    valglandsdelsbogstav: {
      column: 's.valglandsdelsbogstav'
    },
    valglandsdelsnavn: {
      column: 'v.navn'
    },
    afstemningssted_adgangspunkt_x: {
      select: (sqlParts, sqlModel, params) => {
        const sridAlias = dbapi.addSqlParameter(sqlParts, params.srid || 4326);
        return postgisSqlUtil.selectX(params.srid || 4326, sridAlias, 'adgangspunkt_geom');
      }
    },
    afstemningssted_adgangspunkt_y: {
      select: (sqlParts, sqlModel, params) => {
        const sridAlias = dbapi.addSqlParameter(sqlParts, params.srid || 4326);
        return postgisSqlUtil.selectY(params.srid || 4326, sridAlias, 'adgangspunkt_geom');
      }
    }
  },
  opstillingskreds: {
    dagi_id: {
      column:'t.dagi_id'
    },
    nummer: {
      column: 't.nummer'
    },
    kode: {
      column: 't.kode'
    },
    navn: {
      column: 't.navn'
    },
    kredskommunekode: {
      column: 't.kredskommunekode'
    },
    kredskommunenavn: {
      column: 'kk.navn'
    },
    regionskode: {
      column: 'r.kode'
    },
    regionsnavn: {
      column: 'r.navn'
    },
    storkredsnummer: {
      column: 's.nummer'
    },
    storkredsnavn: {
      column: 's.navn'
    },
    valglandsdelsbogstav: {
      column: 's.valglandsdelsbogstav'
    },
    valglandsdelsnavn: {
      column: 'v.navn'
    },
    kommuner: {
      select: `
(select json_agg(json_build_object('kode', kode, 'navn', navn))
from (select distinct k.kode, k.navn 
      from afstemningsomraader a 
        join kommuner k on a.kommunekode = k.kode 
      where
      a.opstillingskreds_dagi_id = t.dagi_id) tab)`
    },
    kommunekode: {
      where: (sqlParts, kommunekode) => {
        const kommunekodeAlias = dbapi.addSqlParameter(sqlParts, kommunekode);
        sqlParts.whereClauses.push(`exists(select * from afstemningsomraader a where a.kommunekode = ${kommunekodeAlias} AND a.opstillingskreds_dagi_id = t.dagi_id)`);
      }
    }
  },
  storkreds: {
    nummer: {
      column: 't.nummer'
    },
    navn: {
      column: 't.navn'
    },
    regionskode: {
      column: 'r.kode'
    },
    regionsnavn: {
      column: 'r.navn'
    },
    valglandsdelsbogstav: {
      column: 'v.bogstav'
    },
    valglandsdelsnavn: {
      column: 'v.navn'
    },
  },
  menighedsrådsafstemningsområde: {
    dagi_id: {
      column:'t.dagi_id'
    },
    nummer: {
      column: 't.nummer'
    },
    navn: {
      column: 't.navn'
    },
    afstemningsstednavn: {
      column: 't.afstemningsstednavn'
    },
    kommunekode: {
      column: 'k.kode',
    },
    kommunenavn: {
      column: 'k.navn'
    },
    sognekode: {
      column: 't.sognekode'
    },
    sognenavn: {
      column: 's.navn'
    }
  },
  supplerendebynavn: {
    dagi_id: {
      column: 'dar_sup.supplerendebynavn1'
    },
    navn: {
      column: 'dar_sup.navn'
    },
    kommunekode: {
      column: 't.kommunekode'
    },
    kommunenavn: {
      column: 'k.navn'
    },
    postnumre: {
      select: `(select json_agg(json_build_object('nr', p.nr, 'navn', p.navn))
      from supplerendebynavn2_postnr sp
        join postnumre p on sp.postnr = p.nr 
      where
      dar_sup.supplerendebynavn1 = sp.supplerendebynavn_dagi_id)`
    },

  }
};

const baseQueries = {
  kommune: () => {
    return {
      select: [],
      from: [`kommuner t 
      natural left join (select r.kode as regionskode, r.navn as regionsnavn from regioner r) r`],
      whereClauses: [],
      orderClauses: [],
      sqlParams: []
    }
  },
  afstemningsområde: () => {
    return {
      select: [],
      from: [`afstemningsomraader t 
      join kommuner k on t.kommunekode = k.kode
      join regioner r on k.regionskode = r.kode
      join opstillingskredse o on t.opstillingskreds_dagi_id = o.dagi_id
      join storkredse s on o.storkredsnummer = s.nummer
      join valglandsdele v on s.valglandsdelsbogstav = v.bogstav
      natural left join (select id as afstemningsstedadresse, geom as adgangspunkt_geom,
      vejnavn, husnr, supplerendebynavn, postnr, postnrnavn from adgangsadresser_mat) a`],
      whereClauses: [],
      orderClauses: [],
      sqlParams: []
    }

  },
  opstillingskreds: () => {
    return {
      select: [],
      from: [`opstillingskredse t 
      join kommuner kk on t.kredskommunekode = kk.kode
      join regioner r on kk.regionskode = r.kode
      join storkredse s on t.storkredsnummer = s.nummer
      join valglandsdele v on s.valglandsdelsbogstav = v.bogstav`],
      whereClauses: [],
      orderClauses: [],
      sqlParams: []
    }
  },
  storkreds: () => {
    return {
      select: [],
      from: [`storkredse t 
      join regioner r on t.regionskode = r.kode
      join valglandsdele v on t.valglandsdelsbogstav = v.bogstav`],
      whereClauses: [],
      orderClauses: [],
      sqlParams: []
    }
  },
  menighedsrådsafstemningsområde: () => {
    return {
      select: [],
      from: [`menighedsraadsafstemningsomraader t 
      join kommuner k on t.kommunekode = k.kode
      join sogne s on t.sognekode = s.kode`],
      whereClauses: [],
      orderClauses: [],
      sqlParams: []
    }
  },
  supplerendebynavn: () => {
    return {
      select: [],
      from: [`dar1_supplerendebynavn_current dar_sup 
      LEFT JOIN dagi_supplerendebynavne t ON dar_sup.supplerendebynavn1 = t.dagi_id
      LEFT JOIN kommuner k ON t.kommunekode = k.kode`],
      whereClauses: [],
      orderClauses: [],
      sqlParams: []
    }
  }
};

const additionalParameterImpls = {
  supplerendebynavn: [(sqlParts, params) => {
    if(!params.medtagnedlagte) {
      dbapi.addWhereClause(sqlParts, 'dar_sup.status in (2,3)');
    }
  }]
};

temaModels.modelList.filter(model => model.published).forEach(model => {
  const commonColumns = Object.assign({
    geom_json: {
      select: function (sqlParts, sqlModel, params) {
        const sridAlias = dbapi.addSqlParameter(sqlParts, params.srid || 4326);
        return postgisSqlUtil.geojsonColumn(params.srid || 4326, sridAlias, 't.geom');
      }
    },
    geo_version: {
      column: 't.geo_version'
    },
    ændret: {
      column: selectIsoTimestampUtc('t.ændret')
    },
    geo_ændret: {
      select: selectIsoTimestampUtc('t.geo_ændret')
    }
  }, postgisSqlUtil.bboxVisualCenterColumns('t'));
  if(model.searchable) {
    commonColumns.tsv = {
      column: 't.tsv'
    };
  }
  const additionalColumns = additionalColumnsMap[model.singular] || {};
  const columns = Object.assign({}, commonColumns, additionalColumns);

  const defaultBaseQuery = function() {
    return {
      select: [],
      from: [`${model.table} t`],
      whereClauses: [],
      orderClauses: [],
      sqlParams: []
    };
  };

  const baseQuery = baseQueries[model.singular] || defaultBaseQuery;

  const parameterImpls = [
    sqlParameterImpl.simplePropertyFilter(parameters[model.singular].propertyFilter, columns),
      ...(additionalParameterImpls[model.singular] || []),
    sqlParameterImpl.reverseGeocodingWithin('t.geom'),
    sqlParameterImpl.geomWithin('t.geom'),
    sqlParameterImpl.search(columns, [], true),
    sqlParameterImpl.autocomplete(columns),
    sqlParameterImpl.paging(columns, model.primaryKey, true)
  ];

  exports[model.singular] = assembleSqlModel(columns, parameterImpls, baseQuery);

  registry.add(model.singular, 'sqlModel', undefined, exports[model.singular]);
});
