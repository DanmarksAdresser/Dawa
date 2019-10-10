"use strict";
const dbapi = require('../../dbapi');
const nameAndKey = require('./nameAndKey');
const sqlParameterImpl = require('../common/sql/sqlParameterImpl');
const parameters = require('./parameters');
const sqlUtil = require('../common/sql/sqlUtil');
const postgisSqlUtil = require('../common/sql/postgisSqlUtil');
const registry = require('../registry');

const assembleSqlModel = sqlUtil.assembleSqlModel;

const columns = {
    geom_json: {
        select: function (sqlParts, sqlModel, params) {
            var sridAlias = dbapi.addSqlParameter(sqlParts, params.srid || 4326);
            return postgisSqlUtil.geojsonColumn(params.srid || 4326, sridAlias, 'geom');
        }
    }
};

function fuzzySearchParameterImpl(sqlParts, params) {
    if(params.fuzzyq) {
        var fuzzyqAlias = dbapi.addSqlParameter(sqlParts, params.fuzzyq);
        sqlParts.from.push(`NATURAL JOIN (SELECT vejnavn, postnr FROM vejnavnpostnummerrelation order by betegnelse <-> ${fuzzyqAlias} limit 200) t1`);
        sqlParts.orderClauses.push(`levenshtein(lower(betegnelse), lower(${fuzzyqAlias}), 2, 1, 3)`);
    }
}



const parameterImpls = [
    sqlParameterImpl.simplePropertyFilter(parameters.propertyFilter, columns),
    sqlParameterImpl.search(columns, ['vejnavn', 'postnr']),
    fuzzySearchParameterImpl,
    sqlParameterImpl.paging(columns, nameAndKey.key)
];

const baseQuery = function() {
    return {
        select: [],
        from: [
            'vejnavnpostnummerrelation'
        ],
        whereClauses: [],
        orderClauses: [],
        sqlParams: []
    };
};



module.exports = sqlUtil.applyFallbackToFuzzySearch(assembleSqlModel(columns, parameterImpls, baseQuery));

registry.add(nameAndKey.singular, 'sqlModel', null, module.exports);
