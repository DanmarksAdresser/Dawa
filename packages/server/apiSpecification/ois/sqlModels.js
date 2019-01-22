"use strict";

const dbapi = require('../../dbapi');
const oisCommon = require('../../ois/common');
const oisApiModels = require('./oisApiModels');
const columnsMap = require('./columns');
const sqlParameterImpl = require('../common/sql/sqlParameterImpl');
const namesAndKeys = require('./namesAndKeys');
const sqlUtil = require('../common/sql/sqlUtil');
const registry = require('../registry');
const parametersMap = require('./parameters').full;
function baseQuery(oisModelName, params) {
  const apiModel = oisApiModels[oisModelName];
  const sqlParts = {
    select: [],
    from: [`${oisCommon.dawaTableName(apiModel.primaryRelation)} ${apiModel.alias}`],
    whereClauses: [],
    orderClauses: [],
    sqlParams: []
  };
  for(let secondaryRelation of apiModel.secondaryRelations) {
    if(!secondaryRelation.aggregate) {
      const tableName = oisCommon.dawaTableName(secondaryRelation.relationName);
      const alias = secondaryRelation.alias;
      const joinClauses = secondaryRelation.clauses.map(clause => `${clause[0]} = ${clause[1]}`).join(' AND');
      sqlParts.from.push(`LEFT JOIN ${tableName} ${alias} ON ${joinClauses} ${params.medtagophørte ? '' : `AND ${alias}.ophoert_ts IS NULL`}`);
    }
  }
  return sqlParts;
}

const medtagOphørteImpl = apiModel => (sqlParts, params)  => {
  if (!params.medtagophørte) {
    dbapi.addWhereClause(sqlParts, `${apiModel.alias}.ophoert_ts IS NULL`);
  }
};

for(let apiModelName of Object.keys(oisApiModels)) {
  const columns = columnsMap[apiModelName];
  const nameAndKey = namesAndKeys[apiModelName];
  const apiModel = oisApiModels[apiModelName];

  const parameterImpls = [
    sqlParameterImpl.simplePropertyFilter(parametersMap[apiModelName].propertyFilter, columns),
    sqlParameterImpl.paging(columns, nameAndKey.key),
    medtagOphørteImpl(apiModel)
  ];

  if(oisApiModels[apiModelName].geojson) {
    parameterImpls.push(sqlParameterImpl.geomWithin());
    parameterImpls.push(sqlParameterImpl.reverseGeocoding());
  }

  module.exports[apiModelName] = sqlUtil.assembleSqlModel(
    columns,
    parameterImpls,
    (fieldNames, params) => baseQuery(apiModelName, params));

  registry.add(`ois_${apiModelName}_full`, 'sqlModel', undefined, module.exports[apiModelName]);
  registry.add(`ois_${apiModelName}_public`, 'sqlModel', undefined, module.exports[apiModelName]);
}

