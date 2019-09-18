const { go } = require('ts-csp');
var dbapi = require('../../dbapi');
const cursorChannel = require('@dawadk/common/src/postgres/cursor-channel');
const grbbrModels = require('../../ois2/parse-ea-model');

const { getReplicationModel, getReplicationBinding } = require('../../ois2/replication-models');
const { makeSelectClause } = require('../replikering/bindings/util');
const sqlParameterImpl = require('../common/sql/sqlParameterImpl');
const createSqlModel = (replicationModel, replicationBinding) => {
  const baseQuery = () => ({
    select: [makeSelectClause(replicationBinding.attributes)],
    from: [replicationBinding.table],
    whereClauses: [],
    groupBy: '',
    orderClauses: [],
    sqlParams: []
  });
  const parameterImpls = [
    sqlParameterImpl.paging({}, ['id']),
  ];
  const allAttrNames = replicationModel.attributes.map(attr => attr.name);
  const createQuery = (fieldNames, params) => {
    const sqlParts = baseQuery();
    parameterImpls.forEach(function(parameterImpl) {
      parameterImpl(sqlParts, params);
    });
    return dbapi.createQuery(sqlParts);
  };
  return {
    allSelectableFieldNames: () => allAttrNames,
    processQuery: (client, fieldNames, params) => go(function*() {
        const query = createQuery(fieldNames, params);
        return (yield this.delegateAbort(client.query(query.sql, query.params))).rows || [];
    }),
    processStream: (client, fieldNames, params, channel, options) => {
      const query = createQuery(fieldNames, params);
      return cursorChannel(client, query.sql, query.params, channel, options);
    }
  };

};

  for(let grbbrModel of grbbrModels) {
    const replicationModel = getReplicationModel(grbbrModel.name, 'current');
    const replicationBinding = getReplicationBinding(grbbrModel.name, 'current');
    exports[grbbrModel.name] = createSqlModel(replicationModel, replicationBinding);
  }
