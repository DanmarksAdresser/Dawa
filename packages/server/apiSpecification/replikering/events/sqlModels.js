"use strict";

const {go} = require('ts-csp');
const cursorChannel = require('@dawadk/common/src/postgres/cursor-channel');

const dbapi = require('../../../dbapi');
const sqlParameterImpl = require('../../common/sql/sqlParameterImpl');
const sqlUtil = require('../../common/sql/sqlUtil');
const parameters = require('./parameters');
const querySenesteSekvensnummer = require('../sekvensnummer/querySenesteSekvensnummer');
const commonParameters = require('../commonParameters');
const datamodels = require('../datamodel');
const dbBindings = require('../dbBindings');
const registry = require('../../registry');
const tableSchema = require('../../../psql/tableModel');
const { makeSelectClause } =  require('../bindings/util');


const validateSekvensnummerParams = (client, params) => go(function* () {
  const senesteHaendelse = yield querySenesteSekvensnummer(client);
  if (params.sekvensnummertil && senesteHaendelse.sekvensnummer < params.sekvensnummertil) {
    throw new sqlUtil.InvalidParametersError("Hændelse med sekvensnummer " + params.sekvensnummertil + " findes ikke. Seneste sekvensnummer: " + senesteHaendelse.sekvensnummer);
  }
});


const baseQuery = (model, binding) => {
  const tableName = binding.table;
  const tableModel = tableSchema.tables[tableName];
  const selectAttributesClause = makeSelectClause(binding.attributes);
  const query = {
    select: ['i.txid, i.operation as operation', sqlUtil.selectIsoDateUtc('t.time') + ' as tidspunkt', 'changeid as sekvensnummer',
      selectAttributesClause],
    from: [`transaction_history t JOIN ${tableName}_changes i ON t.sequence_number = i.changeid`],
    whereClauses: [`entity = '${tableModel.entity}' and public`],
    orderClauses: [],
    sqlParams: []
  };
  return query;
};


const createSqlModel = (model, binding, filterParams) => {
  const allAttrNames = model.attributes.map(attr => attr.name);
  const propertyFilter = sqlParameterImpl.simplePropertyFilter(filterParams, Object.assign({}, binding.attributes,
    {txid: {column: 'i.txid'}}));
  return {
    allSelectableFieldNames: function () {
      return ['operation', 'tidspunkt', 'sekvensnummer', ...allAttrNames]
    },
    validateParams: validateSekvensnummerParams,
    processStream: (client, fieldNames, params, channel, options) => {
      const sqlParts = baseQuery(model, binding);
      if (params.sekvensnummerfra) {
        const fromAlias = dbapi.addSqlParameter(sqlParts, params.sekvensnummerfra);
        dbapi.addWhereClause(sqlParts, 'sequence_number >= ' + fromAlias);
      }
      if (params.sekvensnummertil) {
        const toAlias = dbapi.addSqlParameter(sqlParts, params.sekvensnummertil);
        dbapi.addWhereClause(sqlParts, 'sequence_number <= ' + toAlias);
      }
      if (params.tidspunktfra) {
        const timeFromAlias = dbapi.addSqlParameter(sqlParts, params.tidspunktfra);
        dbapi.addWhereClause(sqlParts, 't.time >=' + timeFromAlias);
      }

      if (params.tidspunkttil) {
        const timeToAlias = dbapi.addSqlParameter(sqlParts, params.tidspunkttil);
        dbapi.addWhereClause(sqlParts, 't.time <=' + timeToAlias);
      }
      if (params.txidfra) {
        const fromAlias = dbapi.addSqlParameter(sqlParts, params.txidfra);
        dbapi.addWhereClause(sqlParts, 'i.txid >= ' + fromAlias);
      }
      if (params.txidtil) {
        const toAlias = dbapi.addSqlParameter(sqlParts, params.txidtil);
        dbapi.addWhereClause(sqlParts, 'i.txid <= ' + toAlias);
      }
      if(params.txidfra || params.txidtil || params.txid) {
        dbapi.addWhereClause(sqlParts, 'i.txid = t.txid');
        sqlParts.orderClauses.push('txid');
      }
      sqlParts.orderClauses.push('changeid');
      propertyFilter(sqlParts, params);
      const query = dbapi.createQuery(sqlParts);
      return cursorChannel(client, query.sql, query.params, channel, options);
    }

  }
};

for (let entityName of Object.keys(datamodels)) {
  const datamodel = datamodels[entityName];
  const binding = dbBindings[entityName];
  const filterParams = [
    ...commonParameters.txid,
    ...(parameters.keyParameters[entityName] || []),
    ...(binding.additionalParameters || [])
  ];
  const sqlModel = createSqlModel(datamodel, binding, filterParams);
  exports[entityName] = sqlModel;
  registry.add(`${entityName}_hændelse`, 'sqlModel', undefined, sqlModel);
}