"use strict";

const _ = require('underscore');

const { go } = require('ts-csp');
const cursorChannel = require('../../../util/cursor-channel');

const querySenesteSekvensnummer = require('../sekvensnummer/querySenesteSekvensnummer');
const dbapi = require('../../../dbapi');
const registry = require('../../registry');
const sqlUtil = require('../../common/sql/sqlUtil');
const datamodels = require('../datamodel');
const dbBindings = require('../dbBindings');

const validateParams = (client, params) => go(function*() {
  const senesteHaendelse = yield querySenesteSekvensnummer(client);
  if (params.sekvensnummer && senesteHaendelse.sekvensnummer < params.sekvensnummer) {
    throw new sqlUtil.InvalidParametersError("hændelse med sekvensnummer " + params.sekvensnummer + " findes ikke. Seneste sekvensnummer: " + senesteHaendelse.sekvensnummer);
  }
});

const createSqlModel = (model, binding) => {
  const allAttrNames = model.attributes.map(attr => attr.name);
  const tableName = binding.table;
  const selectClause = _.pluck(model.attributes, 'name').map(attName => {
    const bindingAttr = binding.attributes[attName];
    const columnName = binding.attributes[attName].column;
    const transformed = bindingAttr.selectTransform(columnName);
    return `${transformed} AS ${attName}`;
  }).join(', ');
  const primaryAttrNames = model.attributes.filter(attr => attr.primary).map(attr => attr.name);
  const primaryColumnNames = primaryAttrNames.map(attrName => binding.attributes[attrName].column);
  const createBaseQuery = (sequenceNumber) => {
    let subselect =
      `SELECT *, row_number()
  OVER (PARTITION BY ${primaryColumnNames.join(', ')}
    ORDER BY changeid desc NULLS LAST) as row_num
FROM ${tableName}_changes`;
    if(sequenceNumber) {
      subselect += ` WHERE (changeid IS NULL OR changeid <= $1)`
    }
    const baseQuery = {
      select: [selectClause],
      from: [`(${subselect}) t`],
      whereClauses: ['row_num = 1 ', `operation <> 'delete'`],
      groupBy: '',
      orderClauses: [],
      sqlParams: []
    };
    if(sequenceNumber) {
      baseQuery.sqlParams.push(sequenceNumber);
    }
    return baseQuery;
  }
  return {
    allSelectableFieldNames: function () {
      return allAttrNames
    },
    validateParams: validateParams,
    processStream: (client, fieldNames, params, channel, options) => {
      const sqlParts = createBaseQuery(params.sekvensnummer);
      const query = dbapi.createQuery(sqlParts);
      return cursorChannel(client, query.sql, query.params, channel, options);
    }
  };
};

for(let entityName of Object.keys(datamodels)) {
  const datamodel = datamodels[entityName];
  const binding = dbBindings[entityName];
  const sqlModel = createSqlModel(datamodel, binding);
  exports[entityName] = sqlModel;
  registry.add(`${entityName}udtraek`, 'sqlModel', undefined, sqlModel);
}