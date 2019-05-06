"use strict";

const { go } = require('ts-csp');
const cursorChannel = require('@dawadk/common/src/postgres/cursor-channel');
const { getColumnName,makeSelectClause, getColumnSpec } = require('../bindings/util');
const querySenesteSekvensnummer = require('../sekvensnummer/querySenesteSekvensnummer');
const dbapi = require('../../../dbapi');
const registry = require('../../registry');
const sqlUtil = require('../../common/sql/sqlUtil');
const datamodels = require('../datamodel');
const dbBindings = require('../dbBindings');
const { keyParameters: keyParametersMap  } = require('../commonParameters');
const sqlParameterImpl = require('../../../apiSpecification/common/sql/sqlParameterImpl');
const validateParams = (client, params) => go(function*() {
  const senesteHaendelse = yield querySenesteSekvensnummer(client);
  if (params.sekvensnummer && senesteHaendelse.sekvensnummer < params.sekvensnummer) {
    throw new sqlUtil.InvalidParametersError("hændelse med sekvensnummer " + params.sekvensnummer + " findes ikke. Seneste sekvensnummer: " + senesteHaendelse.sekvensnummer);
  }
});

const createSqlModel = (model, binding, filterParameters) => {
  const allAttrNames = model.attributes.map(attr => attr.name);
  const tableName = binding.table;
  const propertyFilter = sqlParameterImpl.simplePropertyFilter(filterParameters, getColumnSpec(filterParameters, binding));
  const selectClause = makeSelectClause(binding.attributes);
  const primaryAttrNames = model.key;
  const primaryColumnNames = primaryAttrNames.map(attrName => getColumnName(attrName,binding));
  const createBaseQuery = (sequenceNumber, txid, params) => {
    const rowkeyNestedSelectQueryParts = {
      select: ['distinct ' + primaryColumnNames.join(',')],
      from: [`${tableName}_changes`],
      whereClauses: [],
      groupBy: '',
      orderClauses: [],
      sqlParams: []
    };
    propertyFilter(rowkeyNestedSelectQueryParts, params);
    const rowkeyNestedSelectQuery = dbapi.createQuery(rowkeyNestedSelectQueryParts);
    const sqlParams = rowkeyNestedSelectQuery.params;
    const hasFilterParams = sqlParams.length > 0;
    let subselect =
      `SELECT *, row_number()
  OVER (PARTITION BY ${primaryColumnNames.join(', ')}
    ORDER BY txid desc nulls last, changeid desc NULLS LAST) as row_num
FROM ${tableName}_changes c`;
    if(hasFilterParams) {
      subselect += ` NATURAL JOIN (${rowkeyNestedSelectQuery.sql}) t`
    }
    subselect += ' WHERE true';
    if(sequenceNumber) {
      sqlParams.push(sequenceNumber);
      subselect += ` AND (changeid IS NULL OR changeid <= $${sqlParams.length})`
    }
    if(txid) {
      sqlParams.push(txid);
      subselect += ` AND (txid IS NULL OR txid <= $${sqlParams.length})`
    }
    const baseQuery = {
      select: [selectClause],
      from: [`(${subselect}) t`],
      whereClauses: ['row_num = 1 ', `operation <> 'delete'`],
      groupBy: '',
      orderClauses: [],
      sqlParams
    };
    return baseQuery;
  }
  return {
    allSelectableFieldNames: function () {
      return allAttrNames
    },
    validateParams: validateParams,
    processStream: (client, fieldNames, params, channel, options) => {
      const sqlParts = createBaseQuery(params.sekvensnummer, params.txid, params);
      propertyFilter(sqlParts, params);
      const query = dbapi.createQuery(sqlParts);
      return cursorChannel(client, query.sql, query.params, channel, options);
    }
  };
};

for(let entityName of Object.keys(datamodels)) {
  const datamodel = datamodels[entityName];
  const binding = dbBindings[entityName];
  const keyParameters = keyParametersMap[entityName] || [];
  const sqlModel = createSqlModel(datamodel, binding, [...keyParameters, ...binding.additionalParameters || []]);
  exports[entityName] = sqlModel;
  registry.add(`${entityName}udtraek`, 'sqlModel', undefined, sqlModel);
}