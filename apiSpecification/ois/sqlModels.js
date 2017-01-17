"use strict";

const oisCommon = require('../../ois/common');
const oisApiModels = require('./oisApiModels');
const columnsMap = require('./columns');
const sqlParameterImpl = require('../common/sql/sqlParameterImpl');
const namesAndKeys = require('./namesAndKeys');
const sqlUtil = require('../common/sql/sqlUtil');
const registry = require('../registry');
const parametersMap = require('./parameters');
function baseQuery(oisModelName) {
  const apiModel = oisApiModels[oisModelName];
  const sqlParts = {
    select: [],
    from: [`${oisCommon.dawaTableName(apiModel.primaryRelation)} ${apiModel.alias}`],
    whereClauses: [`${apiModel.alias}.ophoert_ts IS NULL`],
    orderClauses: [],
    sqlParams: []
  };
  for(let secondaryRelation of apiModel.secondaryRelations) {
    if(!secondaryRelation.aggregate) {
      const tableName = oisCommon.dawaTableName(secondaryRelation.relationName);
      const alias = secondaryRelation.alias;
      const joinClauses = secondaryRelation.clauses.map(clause => `${clause[0]} = ${clause[1]}`).join(' AND');
      sqlParts.from.push(`LEFT JOIN ${tableName} ${alias} ON ${joinClauses} AND ${alias}.ophoert_ts IS NULL`);
    }
  }
  return sqlParts;
}

for(let apiModelName of Object.keys(oisApiModels)) {
  const columns = columnsMap[apiModelName];
  const nameAndKey = namesAndKeys[apiModelName];

  const parameterImpls = [
    sqlParameterImpl.simplePropertyFilter(parametersMap[apiModelName].propertyFilter, columns),
    sqlParameterImpl.paging(columns, nameAndKey.key)
  ];

  if(oisApiModels[apiModelName].geojson) {
    parameterImpls.push(sqlParameterImpl.geomWithin());
    parameterImpls.push(sqlParameterImpl.reverseGeocoding());
  }

  module.exports[apiModelName] = sqlUtil.assembleSqlModel(
    columns,
    parameterImpls,
    () => baseQuery(apiModelName));

  registry.add(apiModelName, 'sqlModel', undefined, module.exports[apiModelName]);
}

