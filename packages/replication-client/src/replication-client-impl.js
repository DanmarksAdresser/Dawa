const Promise = require('bluebird');
const _ = require('underscore');
const {go, Channel, parallel} = require('ts-csp');

const {copyStream} = require('@dawadk/import-util/src/postgres-streaming');
const cspUtil = require('@dawadk/common/src/csp-util');
const defaultBindings = require('./default-bindings');
const {csvStringify} = require('@dawadk/common/src/csv-stringify');
const { selectList, columnsEqualClause } = require('@dawadk/common/src/postgres/sql-util');
const tableDiff = require('@dawadk/import-util/src/table-diff');
const {computeDifferences} = tableDiff;
const log = require('./log');
const request = require('request-promise');
const {geomColumn} = require('@dawadk/import-util/src/common-columns');

/**
 * Create a process which streams CSV from ch to the specified table
 */
const chanToDb = (client, ch, table, columnNames, batchSize) => {
  const stream = copyStream(client, table, columnNames);
  return cspUtil.pipeToStream(ch, stream, batchSize);
};

const createTempChangeTable = (client, replication_schema, bindingConf, tableName) =>
  client.query(`CREATE TEMP TABLE ${tableName} AS (select null::integer as txid, 
  null::${replication_schema}.operation_type as operation, 
  ${bindingConf.table}.* from ${bindingConf.table} where false)`);

const createFastMapper = (replikeringModel, entityConf, bindingConf) => obj =>  {
  const result = {};
  for(let attrName of entityConf.attributes) {
    const replikeringAttrModel = _.findWhere(replikeringModel.attributes, {name: attrName});
    let attrValue = obj[attrName];
    const binding = Object.assign({}, defaultBindings[replikeringAttrModel.type], bindingConf.attributes[attrName]);
    result[binding.columnName] = binding.toCsv ? binding.toCsv(attrValue) : attrValue;
  }
  return Promise.resolve(result);
};

const createSlowMapper = (replikeringModel, entityConf, bindingConf) => obj => go(function*() {
  const result = {};
  for(let attrName of entityConf.attributes) {
    const replikeringAttrModel = _.findWhere(replikeringModel.attributes, {name: attrName});
    let attrValue = obj[attrName];
    if( attrValue && attrValue.$url) {
      attrValue = yield request.get({url: attrValue.$url, json: true, gzip: true});
    }
    const binding = Object.assign({}, defaultBindings[replikeringAttrModel.type], bindingConf.attributes[attrName]);
    result[binding.columnName] = binding.toCsv ? binding.toCsv(attrValue) : attrValue;
  }
  return result;
});

const createMapper = (replikeringModel, entityConf, bindingConf) => {
  for(let attrName of entityConf.attributes) {
    const replikeringAttrModel = _.findWhere(replikeringModel.attributes, {name: attrName});
    if(replikeringAttrModel.offloaded) {
      return createSlowMapper(replikeringModel, entityConf, bindingConf);
    }
  }
  return createFastMapper(replikeringModel, entityConf, bindingConf);
};

const copyToTable = (client, src, asyncMapper, table, columnNames, batchSize) => {
  const csvOptions = {
    delimiter: ';',
    quote: '"',
    escape: '\\',
    header: true,
    encoding: 'utf8',
    formatters: {
      bool: value => value ? 'true' : 'false'
    },
    columns: columnNames
  };
  const csvStringifyXf = csvStringify(csvOptions);
  const dbCh = new Channel(batchSize*2, csvStringifyXf);
  const dbProcess = chanToDb(client, dbCh, table, columnNames, batchSize);
  const pipeProcess = cspUtil.pipeMapAsync(src, dbCh, batchSize, asyncMapper);
  return parallel(dbProcess, pipeProcess);
};

const createEventMapper = (txid, replikeringModel, entityConf, bindingConf) => {
  const mapDataFn = createMapper(replikeringModel, entityConf, bindingConf);
  return event => go(function*() {
    return Object.assign(yield mapDataFn(event.data), {
      txid: event.txid,
      operation: event.operation
    });
  });
};

const toTableModel = (replikeringModel, entityConf, bindingConf) => {
  return {
    table: bindingConf.table,
    primaryKey: replikeringModel.key,
    noPublic: true,
    columns: entityConf.attributes.map(attrName => {
      const replikeringAttrModel = _.findWhere(replikeringModel.attributes, {name: attrName});
      const defaultBinding = defaultBindings[replikeringAttrModel.type];
      const attrBinding = Object.assign({}, defaultBinding, bindingConf.attributes[attrName]);
      const columnName = attrBinding.columnName;
      if(['point2d', 'geometry', 'geometry3d'].includes(replikeringAttrModel.type)) {
        return geomColumn({name: columnName})
      }
      else {
        return {
          name: columnName
        };
      }
    })
  };
};

const downloadEntity = (client, remoteTxid, replicationModel, entityConf,
                        bindingConf, batchSize, httpClientImpl, targetTable) => go(function* () {
  const downloadCh = new Channel(0);
  // Produces a stream of parsed records to udtraekCh
  const requestProcess = httpClientImpl.downloadStream(entityConf.name, remoteTxid, downloadCh);
  const columnNames = _.pluck(bindingConf.attributes, 'columnName');
  const copyProcess = copyToTable(client, downloadCh, createMapper(replicationModel, entityConf, bindingConf),
    targetTable, columnNames, batchSize);
  yield parallel(requestProcess, copyProcess);
});

const initializeEntity = (client, remoteTxid, localTxid, replicationModel, replicationSchema,
                          entityConf, bindingConf, httpClientImpl, options) => go(function* () {
  log('info', `Initializing entity ${entityConf.name}`);
  yield downloadEntity(client, remoteTxid, replicationModel, entityConf, bindingConf, options.batchSize, httpClientImpl, bindingConf.table);
  yield client.query(`INSERT INTO ${replicationSchema}.source_transactions(source_txid,local_txid, entity, type)
    VALUES ($1,$2,$3,$4)`, [remoteTxid, localTxid, entityConf.name, 'download']);
  const count = (yield client.queryRows(`select count(*)::integer as cnt from ${bindingConf.table}`))[0].cnt;
  log('info', `Initialized ${entityConf.name} rows=${count}`);
});

const logChanges = (client, txid, entityName, table) => go(function*() {
  const counts = yield client.queryRows(`SELECT operation, count(*)::integer as cnt FROM ${table} where txid=$1 group by operation`,[txid]);
  const countMap = counts.reduce((acc, row) => {
    acc[row.operation] = row.cnt;
    return acc;
  }, {});
  log('info', `Updated ${entityName} inserts=${countMap.insert || 0}, updates=${countMap.update || 0}, deletes=${countMap.delete || 0}`);
});

const updateEntityIncrementally = (client, remoteTxid, localTxid, replicationModel, replicationSchema,
                                   entityConf, bindingConf, httpClientImpl, options) => go(function* () {
  log('info', `Incrementally updating entity ${entityConf.name}`);
  const lastRemoteTxid = (yield client.queryRows(`select max(source_txid) as txid from ${replicationSchema}.source_transactions where entity=$1`, [entityConf.name]))[0].txid;
  const eventCh = new Channel(0);
  const tmpEventTableName = `dawa_client_tmp_changes`;
  yield createTempChangeTable(client, replicationSchema, bindingConf, tmpEventTableName);
  // Produces a stream of parsed records to udtraekCh
  const requestProcess = httpClientImpl.eventStream(entityConf.name, lastRemoteTxid + 1, remoteTxid, eventCh);
  const columnNames = _.pluck(bindingConf.attributes, "columnName");
  const keyColumnNames = replicationModel.key.map(keyName => bindingConf.attributes[keyName].columnName);
  const copyProcess = copyToTable(client, eventCh, createEventMapper(localTxid, replicationModel, entityConf, bindingConf),
    tmpEventTableName, ['txid', 'operation', ...columnNames], options.batchSize);
  yield parallel(requestProcess, copyProcess);
  const count = (yield client.queryRows(`select count(*)::integer as cnt from ${tmpEventTableName}`))[0].cnt;
  if (count === 0) {
    log('info', `No new records for ${entityConf.name}`);
    return;
  }
  // remove any operation that has been replaced by a new operation in the same local transaction
  yield client.query(`
WITH row_numbered AS (
    SELECT *, 
           ROW_NUMBER() OVER(PARTITION BY ${selectList('t', keyColumnNames)}
                                 ORDER BY t.txid DESC) AS rk
      FROM ${tmpEventTableName} t),
      last_operation AS(
SELECT operation, ${columnNames.join(',')}
  FROM row_numbered t
 WHERE t.rk = 1),
 _ as (delete from ${tmpEventTableName})
 INSERT INTO ${tmpEventTableName}(txid, operation, ${columnNames.join(',')})
 (select $1, operation, ${columnNames.join(',')} from last_operation)`, [localTxid]);

  // we treat updates as  inserts if the object doesn't exist.
  yield client.query(`update ${tmpEventTableName}  c set operation = 'insert'
  WHERE c.txid = $1 and c.operation = 'update' and not exists(select * from ${bindingConf.table} t where  ${columnsEqualClause('t', 'c', keyColumnNames)})`, [localTxid]);

  // we treat inserts as updates if the object exist.
  yield client.query(`update ${tmpEventTableName}  c set operation = 'update'
  WHERE c.txid = $1 and c.operation = 'insert' and exists(select * from ${bindingConf.table} t where   ${columnsEqualClause('t', 'c', keyColumnNames)})`, [localTxid]);

  // we ignore deletes on nonexisting objects
  yield client.query(`delete from ${tmpEventTableName} c
  WHERE c.txid = $1 and c.operation = 'delete' and 
  not exists(select * from ${bindingConf.table} t where  ${columnsEqualClause('t', 'c', keyColumnNames)})`, [localTxid]);

  // apply changes
  yield tableDiff.applyChanges(client, localTxid, toTableModel(replicationModel, entityConf, bindingConf), tmpEventTableName);

  yield logChanges(client, localTxid, entityConf.name, tmpEventTableName);
  // record new remote txid
  yield client.query(`INSERT INTO ${replicationSchema}.source_transactions(source_txid,local_txid, entity, type)
    VALUES ($1,$2,$3,$4)`, [remoteTxid, localTxid, entityConf.name, 'event']);

  // Store changes in change table
  if(options.useChangeTable) {
    client.query(`INSERT INTO ${`${bindingConf.table}_changes`}(txid, operation, ${columnNames.join(',')})
    (select txid, operation, ${columnNames.join(',')} from ${tmpEventTableName})`);
  }
  yield client.query(`drop table ${tmpEventTableName}`);

});

const updateEntityUsingDownload = (client, remoteTxid, localTxid, replicationModel, replicationSchema,
                                   entityConf, bindingConf, httpClientImpl, options) => go(function* () {
  log('info', `Updating entity using download ${entityConf.name}`);
  const tmpTableName = `download_${bindingConf.table}`;
  yield client.query(`CREATE TEMP TABLE ${tmpTableName} (LIKE ${bindingConf.table})`);
  yield downloadEntity(client, remoteTxid, replicationModel, entityConf, bindingConf, options.batchSize, httpClientImpl, tmpTableName);
  const tableModel = toTableModel(replicationModel, entityConf, bindingConf);
  if(!options.useChangeTable) {
    yield createTempChangeTable(client, replicationSchema, bindingConf, `${tableModel.table}_changes`);
  }
  yield computeDifferences(client, localTxid, tmpTableName, tableModel);
  yield tableDiff.applyChanges(client, localTxid, tableModel);

  yield client.query(`INSERT INTO ${replicationSchema}.source_transactions(source_txid,local_txid, entity, type)
    VALUES ($1,$2,$3,$4)`, [remoteTxid, localTxid, entityConf.name, 'download']);
  if(!options.useChangeTable) {
    yield client.query(` DROP TABLE ${tableModel.table}_changes`);
  }
});

const updateEntity = (client,
                      remoteTxid,
                      localTxid,
                      replicationModel,
                      replicationSchema,
                      entityConf,
                      bindingConf,
                      pgModel,
                      httpClient,
                      options) => go(function* () {
  const table = bindingConf.table;
  const hasChangeTable = !!pgModel.public[`${table}_changes`];
  const forceDownload = options.forceDownload;

  const hasContent = (yield client.queryRows(`select EXISTS(SELECT * from ${table}) as has_content`))[0].has_content;
  if (!hasContent) {
    return yield initializeEntity(client, remoteTxid, localTxid, replicationModel, replicationSchema,
      entityConf, bindingConf, httpClient,
      {
        useChangeTable: hasChangeTable,
        batchSize: options.batchSize
      });
  }
  else if (!forceDownload) {
    return yield updateEntityIncrementally(client, remoteTxid, localTxid, replicationModel,
      replicationSchema, entityConf, bindingConf, httpClient, {
        useChangeTable: hasChangeTable,
        batchSize: options.batchSize
      });
  }
  else {
    return yield updateEntityUsingDownload(client, remoteTxid, localTxid, replicationModel,
      replicationSchema, entityConf, bindingConf, httpClient, {
        useChangeTable: hasChangeTable,
        batchSize: options.batchSize
      });
  }
});


const update = (client, localTxid, replicationModels, replicationConfig, pgModel, httpClient, options) => go(function* () {
  options = Object.assign({batchSize: 200, forceDownload: false}, options);
  const remoteTxid = options.remoteTxid ?
    options.remoteTxid :
    (yield httpClient.lastTransaction()).txid;
  const allEntityNames = replicationConfig.entities.map(entityConf => entityConf.name);
  const entitiesParam = options.entities;
  let replicatedEntities;
  if(entitiesParam) {
    replicatedEntities = _.intersection(allEntityNames, entitiesParam);
  }
  else {
    replicatedEntities = allEntityNames;
  }
  for (let entityName of replicatedEntities) {
    const entityConf = replicationConfig.entities.find(entityConf =>entityConf.name === entityName);
    const bindingConf = replicationConfig.bindings[entityConf.name];
    yield updateEntity(
      client,
      remoteTxid,
      localTxid,
      replicationModels[entityConf.name],
      replicationConfig.replication_schema,
      entityConf,
      bindingConf,
      pgModel,
      httpClient,
      options);
  }
});

module.exports = {
  update
};