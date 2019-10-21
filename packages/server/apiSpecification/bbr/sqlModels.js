const {go} = require('ts-csp');
const dbapi = require('../../dbapi');
const cursorChannel = require('@dawadk/common/src/postgres/cursor-channel');
const grbbrModels = require('../../ois2/parse-ea-model');
const registry = require('../registry');
const {getEntityName, filterSpecs, geojsonFields} = require('./common');
const {getReplicationModel, getReplicationBinding} = require('../../ois2/replication-models');
const {addSelectForLookup} = require('../replikering/bindings/util');
const sqlParameterImpl = require('../common/sql/sqlParameterImpl');
const parameterMap = require('./parameters');
const createSqlModel = (grbbrModel, replicationModel, replicationBinding, parameters) => {
  const baseQuery = () => {
    const sqlParts = {
      select: [],
      from: [replicationBinding.table],
      whereClauses: [],
      groupBy: '',
      orderClauses: [],
      sqlParams: []
    };
    return sqlParts;
  };
  const propertyFilterColumns = filterSpecs[grbbrModel.name].reduce((acc, {parameter, columnName}) => {
    acc[parameter.name] = { column: columnName};
    return acc;
  }, {});
  const propertyFilterImpl = sqlParameterImpl.simplePropertyFilter(parameters.propertyFilter, propertyFilterColumns);

  const parameterImpls = [
    propertyFilterImpl,
    sqlParameterImpl.paging({}, ['id']),
  ];
  if(geojsonFields[grbbrModel.name]) {
    parameterImpls.push(sqlParameterImpl.geomWithin(geojsonFields[grbbrModel.name]));
    parameterImpls.push(sqlParameterImpl.reverseGeocoding(geojsonFields[grbbrModel.name]));
  }
  const allAttrNames = replicationModel.attributes.map(attr => attr.name);
  const createQuery = (fieldNames, params) => {
    const sqlParts = baseQuery();
    addSelectForLookup(sqlParts, replicationBinding.attributes, params);
    parameterImpls.forEach(function (parameterImpl) {
      parameterImpl(sqlParts, params);
    });
    return dbapi.createQuery(sqlParts);
  };
  return {
    allSelectableFieldNames: () => allAttrNames,
    processQuery: (client, fieldNames, params) => go(function* () {
      const query = createQuery(fieldNames, params);
      return (yield this.delegateAbort(client.query(query.sql, query.params))).rows || [];
    }),
    processStream: (client, fieldNames, params, channel, options) => {
      const query = createQuery(fieldNames, params);
      return cursorChannel(client, query.sql, query.params, channel, options);
    }
  };

};

for (let grbbrModel of grbbrModels) {
  const replicationModel = getReplicationModel(grbbrModel.name, 'current');
  const replicationBinding = getReplicationBinding(grbbrModel.name, 'current');
  const parameters = parameterMap[grbbrModel.name];
  exports[grbbrModel.name] = createSqlModel(grbbrModel, replicationModel, replicationBinding, parameters);
  registry.add(getEntityName(grbbrModel), 'sqlModel', null, exports[grbbrModel.name]);
}
