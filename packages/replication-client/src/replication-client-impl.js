const _ = require('underscore');
const {go, Channel, parallel} = require('ts-csp');
const {comp, map} = require('transducers-js');

const {copyStream} = require('@dawadk/import-util/src/postgres-streaming');
const cspUtil = require('@dawadk/common/src/csp-util');
const defaultBindings = require('./default-bindings');
const {csvStringify} = require('@dawadk/common/src/csv-stringify');
const tableDiff = require('@dawadk/import-util/src/table-diff');
const {computeDifferences} = require('./table-diff');
const log = require('./log');

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


const createMapper = (replikeringModel, entityConf, bindingConf) => obj => {
  return entityConf.attributes.reduce((acc, attrName) => {
    const replikeringAttrModel = _.findWhere(replikeringModel.attributes, {name: attrName});
    const binding = Object.assign({}, defaultBindings[replikeringAttrModel.type], bindingConf.attributes[attrName]);
    acc[binding.columnName] = binding.toCsv ? binding.toCsv(obj[attrName]) : obj[attrName];
    return acc;
  }, {});
};

const copyToTable = (client, src, xform, table, columnNames, batchSize) => {
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
  const dbCh = new Channel(0, comp(xform, csvStringifyXf));
  const dbProcess = chanToDb(client, dbCh, table, columnNames, batchSize);
  const pipeProcess = cspUtil.pipe(src, dbCh, batchSize);
  return parallel(dbProcess, pipeProcess);
};

const createEventMapper = (txid, replikeringModel, entityConf, bindingConf) => {
  const mapDataFn = createMapper(replikeringModel, entityConf, bindingConf);
  return event => Object.assign(mapDataFn(event.data), {
    txid: event.txid,
    operation: event.operation
  });
};

const toTableModel = (replikeringModel, entityConf, bindingConf) => {
  return {
    table: bindingConf.table,
    primaryKey: replikeringModel.key,
    columns: entityConf.attributes.map(attrName => {
      const replikeringAttrModel = _.findWhere(replikeringModel.attributes, {name: attrName});
      const defaultBinding = defaultBindings[replikeringAttrModel.type];
      const attrBinding = Object.assign({}, defaultBinding, bindingConf.attributes[attrName]);
      const column = {name: attrBinding.columnName};
      if (defaultBinding.distinctClause) {
        column.distinctClause = defaultBinding.distinctClause;
      }
      return column;
    })
  };
};

const downloadEntity = (client, remoteTxid, replicationModel, entityConf,
                        bindingConf, batchSize, httpClientImpl, targetTable) => go(function* () {
  const downloadCh = new Channel(0);
  // Produces a stream of parsed records to udtraekCh
  const requestProcess = httpClientImpl.downloadStream(entityConf.name, remoteTxid, downloadCh);
  const columnNames = _.pluck(bindingConf.attributes, 'columnName');
  const copyProcess = copyToTable(client, downloadCh, map(createMapper(replicationModel, entityConf, bindingConf)),
    targetTable, columnNames, batchSize);
  yield parallel(requestProcess, copyProcess);
});

const initializeEntity = (client, remoteTxid, localTxid, replicationModel, replicationSchema,
                          entityConf, bindingConf, httpClientImpl, options) => go(function* () {
  log('info', `Initializing entity ${entityConf.name}`);
  yield downloadEntity(client, remoteTxid, replicationModel, entityConf, bindingConf, options.batchSize, httpClientImpl, bindingConf.table);
  yield client.query(`INSERT INTO ${replicationSchema}.source_transactions(source_txid,local_txid, entity, type)
    VALUES ($1,$2,$3,$4)`, [remoteTxid, localTxid, entityConf.name, 'download']);
});

const updateEntityIncrementally = (client, remoteTxid, localTxid, replicationModel, replicationSchema,
                                   entityConf, bindingConf, httpClientImpl, options) => go(function* () {
  log('info', `Incrementally updating entity ${entityConf.name}`);
  const lastRemoteTxid = (yield client.queryRows(`select max(source_txid) as txid from ${replicationSchema}.source_transactions where entity=$1`, [entityConf.name]))[0].txid;
  const eventCh = new Channel(0);
  const tmpEventTableName = `tmp_${bindingConf.table}_changes`;
  yield createTempChangeTable(client, replicationSchema, bindingConf, tmpEventTableName);
  // Produces a stream of parsed records to udtraekCh
  const requestProcess = httpClientImpl.eventStream(entityConf.name, lastRemoteTxid + 1, remoteTxid, eventCh);
  const columnNames = _.pluck(bindingConf.attributes, "columnName");
  const copyProcess = copyToTable(client, eventCh, map(createEventMapper(localTxid, replicationModel, entityConf, bindingConf)),
    tmpEventTableName, ['txid', 'operation', ...columnNames], options.batchSize);
  yield parallel(requestProcess, copyProcess);
  const count = (yield client.queryRows(`select count(*)::integer as cnt from ${tmpEventTableName}`))[0].cnt;
  if (count === 0) {
    return;
  }
  // remove any operation that has been replaced by a new operation in the same local transaction
  yield client.query(`
WITH row_numbered AS (
    SELECT *, 
           ROW_NUMBER() OVER(PARTITION BY t.id 
                                 ORDER BY t.txid DESC) AS rk
      FROM ${tmpEventTableName} t),
      last_operation AS(
SELECT operation, ${columnNames.join(',')}
  FROM row_numbered t
 WHERE t.rk = 1)
 INSERT INTO ${bindingConf.table}_changes(txid, operation, ${columnNames.join(',')})
 (select $1, operation, ${columnNames.join(',')} from last_operation)`, [localTxid]);

  yield client.query(`drop table ${tmpEventTableName}`);
  // we treat updates as  inserts if the object doesn't exist.
  yield client.query(`update ${bindingConf.table}_changes  c set operation = 'insert'
  WHERE c.txid = $1 and c.operation = 'update' and not exists(select * from ${bindingConf.table} t where  t.id = c.id)`, [localTxid]);

  // we treat inserts as updates if the object exist.
  yield client.query(`update ${bindingConf.table}_changes  c set operation = 'update'
  WHERE c.txid = $1 and c.operation = 'insert' and exists(select * from ${bindingConf.table} t where  t.id = c.id)`, [localTxid]);

  // we ignore deletes on nonexisting objects
  yield client.query(`delete from ${bindingConf.table}_changes c
  WHERE c.txid = $1 and c.operation = 'delete' and 
  not exists(select * from ${bindingConf.table} t where  t.id = c.id)`, [localTxid]);

  // apply changes
  yield tableDiff.applyChanges(client, localTxid, toTableModel(replicationModel, entityConf, bindingConf));

  // record new remote txid
  yield client.query(`INSERT INTO ${replicationSchema}.source_transactions(source_txid,local_txid, entity, type)
    VALUES ($1,$2,$3,$4)`, [remoteTxid, localTxid, entityConf.name, 'event']);
});

const updateEntityUsingDownload = (client, remoteTxid, localTxid, replicationModel, replicationSchema,
                                   entityConf, bindingConf, httpClientImpl, options) => go(function* () {
  log('info', `Updating entity using download ${entityConf.name}`);
  const tmpTableName = `download_${bindingConf.table}`;
  yield client.query(`CREATE TEMP TABLE ${tmpTableName} (LIKE ${bindingConf.table})`);
  yield downloadEntity(client, remoteTxid, replicationModel, entityConf, bindingConf, options.batchSize, httpClientImpl, tmpTableName);
  const tableModel = toTableModel(replicationModel, entityConf, bindingConf);
  yield computeDifferences(client, localTxid, tmpTableName, tableModel);
  // apply changes
  yield tableDiff.applyChanges(client, localTxid, tableModel);

  yield client.query(`INSERT INTO ${replicationSchema}.source_transactions(source_txid,local_txid, entity, type)
    VALUES ($1,$2,$3,$4)`, [remoteTxid, localTxid, entityConf.name, 'download']);
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
  for (let entityConf of replicationConfig.entities) {
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