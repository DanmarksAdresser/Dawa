"use strict";

const {selectIsoDateUtc, assembleSqlModel} = require('../../common/sql/sqlUtil');
const sqlParameterImpl = require('../../common/sql/sqlParameterImpl');
const parameters = require('./parameters');
const dbapi = require('../../../dbapi');

const columns = {
  tidspunkt: {
    column: 'ts',
    selectTransform: selectIsoDateUtc
  },
  operationer: {
    select:
`
(select  coalesce(json_agg(operations), '[]'::json) from
  (select json_build_object('entitet', entity,
                            'inserts', COALESCE((SELECT operation_count
                                                 FROM tx_operation_counts t3
                                                 WHERE
                                                   t3.txid = t2.txid AND
                                                   t3.entity = t2.entity AND
                                                   operation = 'insert'), 0),
                            'updates', COALESCE((SELECT operation_count
                                                 FROM tx_operation_counts t3
                                                 WHERE
                                                   t3.txid = t2.txid AND
                                                   t3.entity = t2.entity AND
                                                   operation = 'update'), 0),
                            'deletes', COALESCE((SELECT operation_count
                                                 FROM tx_operation_counts t3
                                                 WHERE
                                                   t3.txid = t2.txid AND
                                                   t3.entity = t2.entity AND
                                                   operation = 'delete'),
                                                0)) AS operations FROM tx_operation_counts t2 WHERE txid = transactions.txid GROUP BY txid, entity) dummy)`
  }
};

const baseQuery = () => {
  return {
    select: [],
    from: ['transactions'],
    whereClauses: [],
    orderClauses: [],
    sqlParams: []
  };
};

const txidIntervalParameterImpl = (sqlParts, params) => {
  if (params.txidfra) {
    const fromAlias = dbapi.addSqlParameter(sqlParts, params.txidfra);
    dbapi.addWhereClause(sqlParts, `txid >= ${fromAlias}`);
  }
  if (params.txidtil) {
    const toAlias = dbapi.addSqlParameter(sqlParts, params.txidtil);
    dbapi.addWhereClause(sqlParts, `txid <= ${toAlias}`);
  }

};

const parameterImpls = [
  sqlParameterImpl.simplePropertyFilter(parameters.propertyFilter, columns),
  sqlParameterImpl.paging(columns, ['txid'], true),
  txidIntervalParameterImpl
];

const latestParameterImpls = [
  (sqlParts) => {
  sqlParts.limit = 1;
    sqlParts.orderClauses.push('txid DESC');
  }
];

module.exports = {
  query: assembleSqlModel(columns, parameterImpls, baseQuery),
  latest: assembleSqlModel(columns, latestParameterImpls, baseQuery)
};