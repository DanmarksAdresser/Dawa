"use strict";

const _ = require('underscore');
const { go } = require('ts-csp');

const commonParameters = require('../commonParameters');
const resourceImpl = require('../../common/resourceImpl');
const schemaModel = require('../../../psql/tableModel');
const registry = require('../../registry');
const { columnsEqualClause } = require('../../../darImport/sqlUtil');

const inspectInsertOrUpdate = (client, txid, tableModel, operation) => go(function*() {
  const selectList = tableModel.columns.map(column => `${column.name}::text`).join(',');
  const result =  yield client.queryRows(`select ${selectList} from ${tableModel.table}_changes
  WHERE txid = $1 and operation = $2 limit 100`, [txid, operation]);
  return result.map(row => {
    const key = tableModel.primaryKey.reduce((memo, keyName) => {
      memo[keyName] = row[keyName];
      return memo;
    }, {});
    return {key, data: row}
  });
});

const inspectUpdates = (client, txid, tableModel) => go(function*() {
  const beforeSelectList = tableModel.columns.map(column => `c2.${column.name}::text as ${column.name}_before`).join(',');
  const afterSelectList = tableModel.columns.map(column => `c1.${column.name}::text as ${column.name}_after`).join(',');
  const sql = `select ${beforeSelectList}, ${afterSelectList} from ${tableModel.table}_changes c1
left join lateral (
  select * from ${tableModel.table}_changes c2
  where c2.txid < ${txid} and ${columnsEqualClause('c1', 'c2', tableModel.primaryKey)}
  order by txid desc, changeid desc
  limit 1) c2 on true
where c1.txid = ${txid} and c1.operation = 'update' limit 100`;
  const rows = yield client.queryRows(sql);
  return rows.map(row => {
    const key = tableModel.primaryKey.reduce((memo, keyName) => {
      memo[keyName] = row[`${keyName}_after`];
      return memo;
    }, {});
    const mapRowToChanges = row => {
      return tableModel.columns.reduce((memo, column) => {
        const before = row[`${column.name}_before`];
        const after = row[`${column.name}_after`];
        if( before !== after) {
          memo.push({column: column.name, before, after});
        }
        return memo;
      }, []);
    };
    return rows.map(row => {
      return {key, changes: mapRowToChanges(row)};
    });
  });
});

const parameters = [Object.assign({}, commonParameters.txid[0], {required: true})];


const combinedEventHandler = (client, baseUrl, pathParams, queryParams) => go(function* () {
  const [errResponse, validatedParams] = resourceImpl.parseQueryParams(parameters, queryParams);
  if (errResponse) {
    return errResponse;
  }
  const txid = validatedParams.txid;
  const operationCounts = yield this.delegateAbort(client.queryRows(`select * from tx_operation_counts where txid = $1`, [txid]));
  const result = {};

  for(let operationCount of operationCounts) {
    let tableModel = _.findWhere(Object.values(schemaModel.tables), {entity: operationCount.entity});
    if(!tableModel){
      tableModel = _.findWhere(Object.values(schemaModel.tables), {table: operationCount.entity});
    }
    if(tableModel) {
      result[operationCount.entity] = {};
      result[operationCount.entity].inserts = yield inspectInsertOrUpdate(client, txid, tableModel, 'insert');
      result[operationCount.entity].updates = yield inspectUpdates(client, txid, tableModel);
      result[operationCount.entity].deletes = yield inspectInsertOrUpdate(client, txid, tableModel, 'delete');
    }
  }
  return {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=UTF-8'
    },
    body: JSON.stringify(result, undefined, 2)
  }
});

module.exports = {
  path: '/replikering/transaktioner/inspect',
  responseHandler: combinedEventHandler,
  queryParameters: [commonParameters.txid]
};

registry.add('transaktioner', 'httpHandler', 'inspectTransaction', module.exports);

