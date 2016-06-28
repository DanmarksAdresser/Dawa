"use strict";

const path = require('path');
const q = require('q');
const _ = require('underscore');

const tableDiff = require('../importUtil/tablediff');
const darTablediff = require('./darTablediff');
const dawaSpec = require('./dawaSpec');
const importUtil = require('../importUtil/importUtil');
const tablediff = require('../importUtil/tablediff');
const postgresMapper = require('./postgresMapper');

const sqlUtil = require('../darImport/sqlUtil');
const streamToTable = require('./streamToTable');
const Range = require('../psql/databaseTypes').Range;

const selectList = sqlUtil.selectList;

const entities = [
  'Adressepunkt',
  'Adresse',
  'DARAfstemningsområde',
  'DARKommuneinddeling',
  'DARMenighedsrådsafstemningsområde',
  'DARSogneinddeling',
  'Husnummer',
  'NavngivenVej',
  'NavngivenVejKommunedel',
  'Postnummer',
  'SupplerendeBynavn'
];

const dawaChangeOrder = [
  {
    type: 'insert',
    entity: 'vejstykke'
  },
  {
    type: 'update',
    entity: 'vejstykke'
  },
  {
    type: 'delete',
    entity: 'vejstykke'
  },
  {
    type: 'delete',
    entity: 'adresse'
  },
  {
    type: 'insert',
    entity: 'adgangsadresse'
  },
  {
    type: 'update',
    entity: 'adresse'
  },
  {
    type: 'update',
    entity: 'adgangsadresse'
  },
  {
    type: 'delete',
    entity: 'adgangsadresse'
  },
  {
    type: 'insert',
    entity: 'adresse'
  }
];

/**
 * We have a single-row table with some metadata about the dar1 import process.
 * current_tx is the id of the currently executing transaction
 * last_event_id is the id of the last processed event from DAR1.
 * virkning is virkning time for computing DAWA values
 * @param client
 * @returns {*}
 */
function getMeta(client) {
  return client.queryp('select * from dar1_meta').then(result => result.rows[0]);
}

function setMeta(client, meta) {
  const params = [];
  const setSql = Object.keys(meta).map(key => {
    params.push(meta[key]);
    return `${key} = $${params.length}`;
  }).join(',');
  return client.queryp(`UPDATE dar1_meta SET ${setSql}`, params);
}

function setInitialMeta(client) {
  return client.queryp('UPDATE dar1_meta SET virkning = NOW()');
}

function ndjsonFileName(entityName) {
  return entityName.replace(new RegExp('å', 'g'), 'aa') + '.ndjson';
}

/**
 * Get maximum event id across all DAR1 tables
 * @param client
 * @returns {*}
 */
function getMaxEventId(client, tablePrefix) {
  const singleTableSql = (tableName) => `SELECT MAX(GREATEST(eventopret, eventopdater)) FROM ${tablePrefix + tableName}`;
  const list = entities.map(entityName => `(${singleTableSql(`dar1_${entityName}`)})`).join(', ');
  const sql = `select GREATEST(${list}) as maxeventid`;
  return client.queryp(sql).then(result => result.rows[0].maxeventid || 0);
}

function alreadyImported(client) {
  return client.queryp('select * from dar1_adressepunkt limit 1').then(result => !!result.rows);
}

function importFromFiles(client, dataDir) {
  return q.async(function*() {
    const hasAlreadyImported = yield alreadyImported(client);
    if(hasAlreadyImported) {
      yield importIncremental(client, dataDir);
    }
    else {
      yield importInitial(client, dataDir);
    }
  })();
}

function getDawaSeqNum(client) {
  return client.queryp('SELECT MAX(sequence_number) as seqnum FROM transaction_history').then(result => result.rows[0].seqnum);
}

function importInitial(client, dataDir) {
  return q.async(function*() {
    yield setInitialMeta(client);
    yield withDar1Transaction(client, 'csv', q.async(function*() {
      for (let entityName of entities) {
        const filePath = path.join(dataDir, ndjsonFileName(entityName));
        const tableName = postgresMapper.tables[entityName];
        yield streamToTable(client, entityName, filePath, tableName, true);
        const columns = postgresMapper.columns[entityName].join(', ');
        yield client.queryp(`INSERT INTO dar1_${entityName}_current(${columns}) (SELECT ${columns} FROM ${tableName}_current_view)`);
      }
      const maxEventId = yield getMaxEventId(client, '');
      yield setMeta(client, {last_event_id: maxEventId});
    }));
  })();
}

/**
 * Perform a "full update" of DAWA tables, based on DAR1 tables
 * and the virkning time stored in dar1_meta table.
 * @param client
 */
function updateDawa(client) {
  return q.async(function*() {
    for(let entity of Object.keys(dawaSpec)) {
      const spec = dawaSpec[entity];
      const table = spec.table;
      yield tableDiff.computeDifferences(client, `dar1_${table}_view`, table, spec.idColumns, spec.columns);
    }
    for(let change of dawaChangeOrder) {
      const spec = dawaSpec[change.entity];
      const table = spec.table;
      if(change.type === 'insert') {
        yield tablediff.applyInserts(client, `insert_${table}`, table, spec.columns);
      }
      else if(change.type === 'update') {
        yield tableDiff.applyUpdates(client, `update_${table}`, table, spec.idColumns, spec.columns);
      }
      else if(change.type === 'delete') {
        yield tableDiff.applyDeletes(client, `delete_${table}`, table, spec.idColumns);
      }
      else {
        throw new Error();
      }
    }
  })();
}

function importIncremental(client, dataDir) {
  return withDar1Transaction(client, 'csv', () => {
    return q.async(function*() {
      for (let entityName of entities) {
        const columns = postgresMapper.columns[entityName];
        const filePath = path.join(dataDir, ndjsonFileName(entityName));
        const tableName = postgresMapper.tables[entityName];
        const desiredTableName = `desired_${tableName}`;
        yield client.queryp(`create temp table ${desiredTableName} (LIKE ${tableName})`);
        yield streamToTable(client, entityName, filePath, desiredTableName, true);
        const eventId = getMaxEventId(client, 'desired_');
        yield darTablediff.computeDifferences(client, desiredTableName, tableName, columns, eventId);
        yield darTablediff.logChanges(client, entityName, tableName);
        yield darTablediff.applyChanges(client, tableName, columns);
        yield tablediff.dropChangeTables(client, tableName);
        yield importUtil.dropTable(desiredTableName);
      }
    })();
  });
}

function fetchTableColumns(entityName) {
  const columns = postgresMapper.columns[entityName];
  return _.without(columns, 'eventopret', 'eventopdater').concat('eventid');

}

function createFetchedTable(client, entityName, fetchedTable) {
  const columns = fetchTableColumns(entityName);
  const table = postgresMapper.columns[entityName];
  return client.queryBatched(`CREATE TEMP TABLE  ${fetchedTable} AS
     select ${_.without(columns, 'eventid').join(', ')}, 1 as eventid FROM ${table} WHERE false`);
}

function createFetchTables(client, changeset) {
  return q.async(function*() {
    for (let entityName of Object.keys(changeset)) {
      yield createFetchedTable(client, entityName, `fetched_${postgresMapper.tables[entityName]}`);
    }
  })();
}

function storeChangesetInFetchTables(client, changeset) {
  return q.async(function*() {
    yield createFetchTables(client, changeset);
    for (let entityName of Object.keys(changeset)) {
      const rows = changeset[entityName];
      const targetTable = postgresMapper.tables[entityName];
      const mappedRows = rows.map(postgresMapper.createMapper(entityName, true));
      const fetchedTable = `fetched_${targetTable}`;
      const fetchColumns = fetchTableColumns(entityName);
      yield importUtil.streamArrayToTable(client, mappedRows, fetchedTable, fetchColumns);
    }
  })();
}

function applyFetchTables(client, entityNames) {
  return q.async(function*() {
    for (let entityName of Object.keys(entityNames)) {
      const table = postgresMapper.tables[entityName];
      const fetchTable = `fetched_${table}`;
      const allColumns = postgresMapper.columns[entityName];
      const regularColumns = _.without(allColumns, 'eventopret', 'eventopdater');
      // Vi antager at opdateringer overholder de givne invarianter, dvs.:
      // 1. Rækker uden registreringtil er nye rækker som skal indsættes
      // 2. Rækker med registreringtil er eksisterende rækker som skal opdateres,
      //    og det er kun nødvendigt at opdatere eventopdater og registrering kolonnerne
      yield client.queryBatched(`INSERT INTO ${table}(eventopret, ${regularColumns.join(', ')}) (SELECT eventid, ${selectList(null, regularColumns)} FROM ${fetchTable} WHERE upper(registrering) IS NULL)`);
      yield client.queryBatched(`UPDATE ${table} SET eventopdater = eventid, registrering = ${fetchTable}.registrering FROM ${fetchTable} WHERE ${fetchTable}.rowkey = ${table}.rowkey`);
      // TODO log changes
    }
  })();
}

function computeChangedDawaObjects(client, changedDarEntityNames) {
  return q.async(function*() {
    yield client.queryBatched(`CREATE TEMP TABLE changed_vejstykker(kommunekode smallint, vejkode smallint, primary key(kommunekode, vejkode))`);
    yield client.queryBatched('CREATE TEMP TABLE changed_adgangsadresser(id uuid PRIMARY KEY)');
    yield client.queryBatched('CREATE TEMP TABLE changed_enhedsadresser(id uuid PRIMARY KEY)');
    if (_.contains(changedDarEntityNames, 'NavngivenVejKommunedel')) {
      yield client.queryBatched(`INSERT INTO changed_vejstykker(kommunekode, vejkode)
      (SELECT distinct kommune as kommunekode, vejkode FROM fetched_${postgresMapper.tables.NavngivenVejKommunedel})`);
    }
    if (_.contains(changedDarEntityNames, 'Husnummer')) {
      yield client.queryBatched(`INSERT INTO changed_adgangsadresser (SELECT distinct id FROM fetched_${postgresMapper.tables.Husnummer})`);
    }
    if (_.contains(changedDarEntityNames, 'AdressePunkt')) {
      yield client.queryBatched(`INSERT INTO changed_adgangsadresser (SELECT distinct hn.id FROM fetched_${postgresMapper.tables.AdressePunkt} ap JOIN Husnummer hn ON hn.adgangspunkt_id = ap.id WHERE hn.id NOT IN (SELECT id from changed_adgangsadresser))`);
    }
    if (_.contains(changedDarEntityNames, 'Adresse')) {
      yield client.queryBatched(`INSERT INTO changed_enhedsadresser (SELECT distinct id FROM fetched_${postgresMapper.tables.Adresse})`);
    }
    for (let table of ['changed_vejstykker', 'changed_adgangsadresser', 'changed_enhedsadresser']) {
      yield client.queryBatched(`ANALYZE ${table}`);
    }
  })();
}

function dropFetchTables(client, entityNames) {
  return q.async(function*() {
    for (let entityName of entityNames) {
      yield client.queryBatched(`DROP TABLE fetched_${postgresMapper.tables[entityName]}`);
    }
  })();
}

function importChangeset(client, changeset) {
  return q.async(function*() {
    yield storeChangesetInFetchTables(client, changeset);
    yield applyFetchTables(client, Object.keys(changeset));
    yield computeChangedDawaObjects(client, Object.keys(changeset));
    yield dropFetchTables(client, Object.keys(changeset));

  })();
}

function withDar1Transaction(client, source, fn) {
  return q.async(function*() {
    const dawaSeqBefore = yield getDawaSeqNum(client);
    yield client.queryp("update dar1_meta set current_tx= COALESCE( (SELECT max(id)+1 from dar1_transaction), 1)");
    yield fn();
    const dawaSeqAfter = yield getDawaSeqNum(client);
    const dawaSeqRange = new Range(dawaSeqBefore, dawaSeqAfter, '(]');
    yield client.queryp(`insert into dar1_transaction(id, ts, source, dawa_seq_range) \
VALUES ((select current_tx from dar1_meta), NOW(), $1, $2)`,
      [source, dawaSeqRange]);
    yield client.queryp("update dar1_meta set current_tx = NULL");
  })();
}

module.exports = {
  importFromFiles: importFromFiles,
  importInitial: importInitial,
  importIncremental: importIncremental,
  withDar1Transaction: withDar1Transaction,
  importChangeset: importChangeset,
  updateDawa: updateDawa,
  internal: {
    getMaxEventId: getMaxEventId,
    getMeta: getMeta
  }
};
