"use strict";

const _ = require('underscore');
const { go } = require('ts-csp');
const cursorChannel = require('../../../util/cursor-channel');

const dbapi = require('../../../dbapi');
const sqlParameterImpl = require('../../common/sql/sqlParameterImpl');
const sqlUtil = require('../../common/sql/sqlUtil');
const parameters = require('./parameters');
const querySenesteSekvensnummer = require('../sekvensnummer/querySenesteSekvensnummer');
const datamodels = require('../datamodel');
const dbBindings = require('../dbBindings');
const registry = require('../../registry');


const validateSekvensnummerParams = (client, params) => go(function*() {
  const senesteHaendelse = yield querySenesteSekvensnummer(client);
  if (params.sekvensnummertil && senesteHaendelse.sekvensnummer < params.sekvensnummertil) {
    throw new sqlUtil.InvalidParametersError("Hændelse med sekvensnummer " + params.sekvensnummertil + " findes ikke. Seneste sekvensnummer: " + senesteHaendelse.sekvensnummer);
  }
});

const baseQuery = (model, binding) => {
  const tableName = binding.table;
  const selectAttributesClauses = _.pluck(model.attributes, 'name').map(attName => {
    const bindingAttr = binding.attributes[attName];
    const columnName = binding.attributes[attName].column;
    const transformed = bindingAttr.selectTransform(columnName);
    return `${transformed} AS ${attName}`;
  });
  const query = {
    select: ['i.txid, i.operation as operation', sqlUtil.selectIsoDateUtc('t.ts') + ' as tidspunkt', 'changeid as sekvensnummer',
      ...selectAttributesClauses],
    from: [`transactions t JOIN ${tableName}_changes i ON t.txid = i.txid`],
    whereClauses: ['public'],
    orderClauses: ['changeid'],
    sqlParams: []
  };
  return query;
};


const createSqlModel = (model, binding, filterParams) => {
  const allAttrNames = model.attributes.map(attr => attr.name);
  const propertyFilter = sqlParameterImpl.simplePropertyFilter(filterParams, binding.attributes);
  return {
    allSelectableFieldNames: function () {
      return ['operation', 'tidspunkt', 'sekvensnummer', ...allAttrNames]
    },
    validateParams: validateSekvensnummerParams,
    processStream: (client, fieldNames, params, channel, options) => {
      const sqlParts = baseQuery(model, binding);
      if (params.sekvensnummerfra) {
        const fromAlias = dbapi.addSqlParameter(sqlParts, params.sekvensnummerfra);
        dbapi.addWhereClause(sqlParts, 'changeid >= ' + fromAlias);
      }
      if (params.sekvensnummertil) {
        const toAlias = dbapi.addSqlParameter(sqlParts, params.sekvensnummertil);
        dbapi.addWhereClause(sqlParts, 'changeid <= ' + toAlias);
      }
      if (params.tidspunktfra) {
        const timeFromAlias = dbapi.addSqlParameter(sqlParts, params.tidspunktfra);
        dbapi.addWhereClause(sqlParts, 't.ts >=' + timeFromAlias);
      }

      if (params.tidspunkttil) {
        const timeToAlias = dbapi.addSqlParameter(sqlParts, params.tidspunkttil);
        dbapi.addWhereClause(sqlParts, 't.ts <=' + timeToAlias);
      }
      if(params.txidfra) {
        const fromAlias = dbapi.addSqlParameter(sqlParts, params.txidfra);
        dbapi.addWhereClause(sqlParts, 'i.txid >= ' + fromAlias);
      }
      if (params.txidtil) {
        const toAlias = dbapi.addSqlParameter(sqlParts, params.txidtil);
        dbapi.addWhereClause(sqlParts, 'i.txid <= ' + toAlias);
      }
      propertyFilter(sqlParts, params);
      const query = dbapi.createQuery(sqlParts);
      return cursorChannel(client, query.sql, query.params, channel, options);
    }

  }
};

for(let entityName of Object.keys(datamodels)) {
  const datamodel = datamodels[entityName];
  const binding = dbBindings[entityName];
  const filterParams = parameters.keyParameters[entityName] || [];
  const sqlModel = createSqlModel(datamodel, binding, filterParams);
  exports[entityName] = sqlModel;
  registry.add(`${entityName}_hændelse`, 'sqlModel', undefined, sqlModel);
}