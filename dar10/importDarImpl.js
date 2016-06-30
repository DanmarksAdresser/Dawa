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
const columnsEqualClause = sqlUtil.columnsEqualClause;

const ALL_DAR_ENTITIES = [
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
  const list = ALL_DAR_ENTITIES.map(entityName => `(${singleTableSql(`dar1_${entityName}`)})`).join(', ');
  const sql = `select GREATEST(${list}) as maxeventid`;
  return client.queryp(sql).then(result => result.rows[0].maxeventid || 0);
}

function alreadyImported(client) {
  return client.queryp('select * from dar1_adressepunkt limit 1').then(result => result.rows.length > 0);
}

function importFromFiles(client, dataDir, skipDawa) {
  return q.async(function*() {
    const hasAlreadyImported = yield alreadyImported(client);
    if (hasAlreadyImported) {
      yield importIncremental(client, dataDir, skipDawa);
    }
    else {
      yield importInitial(client, dataDir, skipDawa);
    }
  })();
}

function getDawaSeqNum(client) {
  return client.queryp('SELECT MAX(sequence_number) as seqnum FROM transaction_history').then(result => result.rows[0].seqnum);
}

function importInitial(client, dataDir, skipDawa) {
  return q.async(function*() {
    yield setInitialMeta(client);
    yield withDar1Transaction(client, 'initial', q.async(function*() {
      for (let entityName of ALL_DAR_ENTITIES) {
        const filePath = path.join(dataDir, ndjsonFileName(entityName));
        const tableName = postgresMapper.tables[entityName];
        yield streamToTable(client, entityName, filePath, tableName, true);
        const columns = postgresMapper.columns[entityName].join(', ');
        yield client.queryp(`INSERT INTO dar1_${entityName}_current(${columns}) (SELECT ${columns} FROM ${tableName}_current_view)`);
      }
      const maxEventId = yield getMaxEventId(client, '');
      yield setMeta(client, {last_event_id: maxEventId});
      if(!skipDawa) {
        yield updateDawa(client);
      }
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
    for (let entity of Object.keys(dawaSpec)) {
      const spec = dawaSpec[entity];
      const table = spec.table;
      yield tableDiff.computeDifferences(client, `dar1_${table}_view`, table, spec.idColumns, spec.columns);
    }
    yield applyDawaChanges(client);
  })();
}

function applyDawaChanges(client) {
  return q.async(function*() {
    for (let change of dawaChangeOrder) {
      const spec = dawaSpec[change.entity];
      const table = spec.table;
      if (change.type === 'insert') {
        yield tablediff.applyInserts(client, `insert_${table}`, table, spec.columns);
      }
      else if (change.type === 'update') {
        yield tableDiff.applyUpdates(client, `update_${table}`, table, spec.idColumns, spec.columns);
      }
      else if (change.type === 'delete') {
        yield tableDiff.applyDeletes(client, `delete_${table}`, table, spec.idColumns);
      }
      else {
        throw new Error();
      }
    }
  })();
}

const dirtyDeps = {
  vejstykke: [
    'NavngivenVej', 'NavngivenVejKommunedel'
  ],
  adgangsadresse: [
    'Husnummer',
    'Adressepunkt',
    'DARKommuneinddeling',
    'NavngivenVej',
    'NavngivenVejKommunedel',
    'Postnummer',
    'SupplerendeBynavn'
  ],
  adresse: [
    'Adresse'
  ]
};

function createFetchTable(client, tableName) {
  const fetchTable = `fetch_${tableName}`;
  return  client.queryp(`create temp table ${fetchTable} (LIKE ${tableName})`);
}

function copyDumpToTables(client, dataDir) {
  return q.async(function*() {
    for (let entityName of ALL_DAR_ENTITIES) {
      const filePath = path.join(dataDir, ndjsonFileName(entityName));
      const tableName = postgresMapper.tables[entityName];
      const fetchTable = `fetch_${tableName}`;
      yield createFetchTable(client, tableName);
      yield streamToTable(client, entityName, filePath, fetchTable, true);
    }
  })()
}

function copyEventIdsToFetchTable(client, fetchTable, table) {
  return client.queryp(`UPDATE ${fetchTable} F 
      SET eventopret = COALESCE(f.eventopret, t.eventopret), 
      eventopdater = COALESCE(f.eventopdater, t.eventopdater) 
      FROM ${table} t WHERE f.rowkey = t.rowkey`);

}

function computeDumpDifferences(client) {
  return q.async(function*() {
    const eventId = yield getMaxEventId(client, 'fetch_');
    for (let entityName of ALL_DAR_ENTITIES) {
      const tableName = postgresMapper.tables[entityName];
      const fetchTable = `fetch_${tableName}`;
      yield client.queryp(`CREATE UNIQUE INDEX ON ${fetchTable}(rowkey)`);
      // add/expire any rows added/expired after the dump was generated
      yield client.queryp(`INSERT INTO ${fetchTable} (SELECT * FROM ${tableName} 
      WHERE eventOpret > $1 OR eventopdater > $1) 
      ON CONFLICT (rowkey) DO UPDATE SET registrering = EXCLUDED.registrering`, [eventId]);
      // ensure we do not overwite eventopret and eventopdater with NULLs
      // DAR1 may discard them
      yield copyEventIdsToFetchTable(client, fetchTable, tableName);

      const columns = postgresMapper.columns[entityName];
      yield tablediff.computeDifferences(client, `fetch_${tableName}`, tableName, ['rowkey'], columns);
      yield darTablediff.logChanges(client, entityName, tableName);
      yield importUtil.dropTable(client, fetchTable);
    }
  })();
}

function applyDarDifferences(client, darEntities) {
  return q.async(function*() {
    for (let entity of darEntities) {
      const table = postgresMapper.tables[entity];
      const columns = postgresMapper.columns[entity];
      yield tablediff.applyChanges(client, table, table, ['rowkey'], columns, columns);
    }
  })();

}

function importIncremental(client, dataDir, skipDawa) {
  return withDar1Transaction(client, 'csv', () => {
    return q.async(function*() {
      yield copyDumpToTables(client, dataDir);
      yield computeDumpDifferences(client);
      yield applyIncrementalDifferences(client, skipDawa, ALL_DAR_ENTITIES);
    })();
  });
}

/**
 * Given updated DAR tables, but the corresponding insert_, update_ and delete_ tables still present,
 * incrementially update the _current tables.
 * @param client
 * @returns {*}
 */
function computeIncrementalChangesToCurrentTables(client, darEntities) {
  return q.async(function*() {
    for (let entity of darEntities) {
      const table = postgresMapper.tables[entity];
      const columns = postgresMapper.columns[entity];
      const currentTable = `${table}_current`;
      const currentTableView = `${currentTable}_view`;
      const dirtyTable = `dirty_${currentTable}`;
      const dirtySelect = ['insert', 'update', 'delete']
        .map(prefix => `SELECT rowkey from ${prefix}_${table} `)
        .join(' UNION ');
      yield client.queryp(`create temp table ${dirtyTable} as (${dirtySelect})`);
      yield tablediff.computeDifferencesSubset(
        client, dirtyTable, currentTableView, currentTable, ['rowkey'], columns);
      yield client.queryp(`drop table ${dirtyTable}`)
    }
  })();
}

function dropDarChangeTables(client, darEntities) {
  return q.async(function*() {
    for (let entity of darEntities) {
      const table = postgresMapper.tables[entity];
      yield tablediff.dropChangeTables(client, table);
    }
  })();
}

function dropDarCurrentChangeTables(client, darEntities) {
  return q.async(function*() {
    for (let entity of darEntities) {
      const table = postgresMapper.tables[entity];
      yield tablediff.dropChangeTables(client, `${table}_current`);
    }
  })();
}

function computeDirtyDarIds(client, darEntities) {
  return q.async(function*() {
    for (let entity of darEntities) {
      const table = postgresMapper.tables[entity];
      const currentTable = `${table}_current`;
      const dirtyTable = `dirty_${currentTable}`;
      yield client.queryBatched(`CREATE TEMP TABLE ${dirtyTable} AS (\
SELECT ${currentTable}.id FROM delete_${currentTable} NATURAL JOIN ${currentTable} UNION \
SELECT ${currentTable}.id FROM update_${currentTable} \
    JOIN ${currentTable} ON ${columnsEqualClause(`update_${currentTable}`, currentTable, ['rowkey'])} UNION \
SELECT id FROM update_${currentTable} UNION \
SELECT id FROM insert_${currentTable})`);
    }
  })();
}

function dropDirtyDarIdTables(client, darEntities) {
  return q.async(function*() {
    for (let entity of darEntities) {
      const table = postgresMapper.tables[entity];
      const currentTable = `${table}_current`;
      const dirtyTable = `dirty_${currentTable}`;
      yield importUtil.dropTable(client, dirtyTable);
    }
  })();
}

function createDirtyDawaTables(client) {
  return q.async(function*() {
    for (let dawaEntity of Object.keys(dawaSpec)) {
      const dawaTable = dawaSpec[dawaEntity].table;
      const dawaIdColumns = dawaSpec[dawaEntity].idColumns;
      yield client.queryBatched(`CREATE TEMP TABLE dirty_${dawaTable} AS SELECT ${dawaIdColumns.join(', ')} FROM ${dawaTable} WHERE false`);
    }
  })();
}

function computeDirtyDawaIds(client, darEntities) {
  return q.async(function*() {
    for (let dawaEntity of Object.keys(dawaSpec)) {
      const dawaTable = dawaSpec[dawaEntity].table;
      const dawaIdColumns = dawaSpec[dawaEntity].idColumns;
      const relevantEntities = _.intersection(dirtyDeps[dawaEntity], darEntities);

      const selectDirtys = relevantEntities.map(darEntity => {
        const darTable = postgresMapper.tables[darEntity];
        const darTableCurrent = `${darTable}_current`;
        const dirtyDarTable = `dirty_${darTableCurrent}`;

        const darEntityIdColumn = `${darEntity.toLowerCase()}_id`;
        return `SELECT ${selectList('v', dawaIdColumns)} FROM dar1_${dawaTable}_dirty_view v JOIN ${dirtyDarTable} d ON v.${darEntityIdColumn} = d.id`;
      }).join(' UNION ');
      yield client.queryBatched(`WITH existing AS (SELECT ${dawaIdColumns.join(', ')} FROM dirty_${dawaTable}), \
dels AS (delete from dirty_${dawaTable})      
INSERT INTO dirty_${dawaTable}(${dawaIdColumns.join(', ')}) (select * from existing UNION ${selectDirtys})`);
    }
  })();
}


function applyChangesToCurrentDar(client, darEntities) {
  return q.async(function*() {
    for (let entity of darEntities) {
      const table = postgresMapper.tables[entity];
      const currentTable = `${table}_current`;
      yield tablediff.applyChanges(client, currentTable, currentTable, ['rowkey'],
        postgresMapper.columns[entity], postgresMapper.columns[entity]);
    }
  })();
}

function updateDawaIncrementally(client) {
  return q.async(function*() {
    for (let dawaEntity of ['vejstykke', 'adgangsadresse', 'adresse']) {
      const spec = dawaSpec[dawaEntity];
      const table = spec.table;
      const dirtyTable = `dirty_${table}`;
      const view = `dar1_${table}_view`;
      yield tablediff.computeDifferencesSubset(client, dirtyTable, view, table, spec.idColumns,
        spec.columns);
    }
    yield applyDawaChanges(client);
  })();
}

function dropDawaDirtyTables(client) {
  return q.async(function*() {
    for(let dawaEntity of ['vejstykke', 'adgangsadresse', 'adresse']) {
      yield importUtil.dropTable(client, `dirty_${dawaSpec[dawaEntity].table}`);
    }
  })();
}

function dropDawaChangeTables(client) {
  return q.async(function*() {
    for(let dawaEntity of ['vejstykke', 'adgangsadresse', 'adresse']) {
      yield tablediff.dropChangeTables(client, dawaSpec[dawaEntity].table);
    }
  })();
}

function applyIncrementalDifferences(client, skipDawaUpdate, darEntities) {
  return q.async(function*() {
    yield applyDarDifferences(client, darEntities);
    yield computeIncrementalChangesToCurrentTables(client, darEntities);
    yield dropDarChangeTables(client, darEntities);
    if (!skipDawaUpdate) {
      yield computeDirtyDarIds(client, darEntities);
      yield createDirtyDawaTables(client);
      yield computeDirtyDawaIds(client, darEntities);
    }
    yield applyChangesToCurrentDar(client, darEntities);
    if (!skipDawaUpdate) {
      // due to the joining, some dirty DAWA ids is computed before changing the current dar tables,
      // and some are computed after
      yield computeDirtyDawaIds(client, darEntities);
    }
    yield dropDarCurrentChangeTables(client, darEntities);
    if (!skipDawaUpdate) {
      yield dropDirtyDarIdTables(client, darEntities);
      yield updateDawaIncrementally(client);
      yield dropDawaDirtyTables(client);
      yield dropDawaChangeTables(client);
    }
  })();
}

function storeChangesetInFetchTables(client, changeset) {
  return q.async(function*() {
    for (let entityName of Object.keys(changeset)) {
      const rows = changeset[entityName];
      const targetTable = postgresMapper.tables[entityName];
      const mappedRows = rows.map(postgresMapper.createMapper(entityName, true));
      for(let row of mappedRows) {
        const eventid = row.eventid;
        delete row.eventid;
        if(row.registreringtil) {
          // opdatering
          row.eventopdater = eventid;
        }
        else {
          row.eventopret = eventid;
        }

      }
      const fetchedTable = `fetch_${targetTable}`;
      const columns = postgresMapper.columns[entityName];
      yield createFetchTable(client, targetTable);
      yield importUtil.streamArrayToTable(client, mappedRows, fetchedTable, columns);
      yield copyEventIdsToFetchTable(client, fetchedTable, targetTable);
    }
  })();
}

function importChangeset(client, changeset, skipDawa) {
  const entities = Object.keys(changeset);
  return q.async(function*() {
    yield storeChangesetInFetchTables(client, changeset);
    for(let entity of entities) {
      const table = postgresMapper.tables[entity];
      yield client.queryp(`CREATE TEMP TABLE dirty_${table} AS (SELECT rowkey FROM fetch_${table})`);
      yield tablediff.computeDifferencesSubset(client, `dirty_${table}`, `fetch_${table}`, table, ['rowkey'], postgresMapper.columns[entity]);
      yield importUtil.dropTable(client, `dirty_${table}`);
      yield importUtil.dropTable(client, `fetch_${table}`);
    }
    yield applyIncrementalDifferences(client, skipDawa, entities);
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
    ALL_DAR_ENTITIES: ALL_DAR_ENTITIES,
    getMaxEventId: getMaxEventId,
    getMeta: getMeta,
    setInitialMeta: setInitialMeta
  }
};
