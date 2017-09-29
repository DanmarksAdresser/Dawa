"use strict";

const path = require('path');
const {go} = require('ts-csp');
const q = require('q');
const _ = require('underscore');

const darTablediff = require('./darTablediff');
const dawaSpec = require('./dawaSpec');
const importUtil = require('../importUtil/importUtil');
const moment = require('moment');
const tablediff = require('../importUtil/tablediff');
const tableDiffNg = require('../importUtil/tableDiffNg');
const postgresMapper = require('./postgresMapper');

const sqlCommon = require('../psql/common');
const sqlUtil = require('../darImport/sqlUtil');
const streamToTable = require('./streamToTable');
const tableModels = require('../psql/tableModel');
const Range = require('../psql/databaseTypes').Range;
const { recomputeMaterializedDawa, materializeDawa} = require('../importUtil/materialize');
const logger = require('../logger').forCategory('dar10Import');

const selectList = sqlUtil.selectList;
const columnsEqualClause = sqlUtil.columnsEqualClause;

const tema = require('../temaer/tema');
const temaer = require('../apiSpecification/temaer/temaer');

const ALL_DAR_ENTITIES = [
  'Adresse',
  'Adressepunkt',
  'DARAfstemningsområde',
  'DARKommuneinddeling',
  'DARMenighedsrådsafstemningsområde',
  'DARSogneinddeling',
  'Husnummer',
  'NavngivenVej',
  'NavngivenVejKommunedel',
  'NavngivenVejPostnummerRelation',
  'NavngivenVejSupplerendeBynavnRelation',
  'Postnummer',
  'ReserveretVejnavn',
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
    entity: 'adgangsadresse'
  },
  {
    type: 'update',
    entity: 'adresse'
  },
  {
    type: 'insert',
    entity: 'vejpunkt'
  },
  {
    type: 'update',
    entity: 'vejpunkt'
  },
  {
    type: 'delete',
    entity: 'adgangsadresse'
  },
  {
    type: 'insert',
    entity: 'adresse'
  },
  {
    type: 'delete',
    entity: 'navngivenvej'
  },
  {
    type: 'delete',
    entity: 'vejpunkt'
  },
  {
    type: 'update',
    entity: 'navngivenvej'
  },
  {
    type: 'insert',
    entity: 'navngivenvej'
  },
  {
    type: 'delete',
    entity: 'navngivenvej_postnummer'
  },
  {
    type: 'update',
    entity: 'navngivenvej_postnummer'
  },
  {
    type: 'insert',
    entity: 'navngivenvej_postnummer'
  },
  {
    type: 'delete',
    entity: 'vejstykke_postnummer'
  },
  {
    type: 'update',
    entity: 'vejstykke_postnummer'
  },
  {
    type: 'insert',
    entity: 'vejstykke_postnummer'
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

const importFromFiles = (client, txid, dataDir, skipDawa) => go(function*() {
  const hasAlreadyImported = yield alreadyImported(client);
  if (hasAlreadyImported) {
    yield importIncremental(client, txid, dataDir, skipDawa);
  }
  else {
    yield importInitial(client, txid, dataDir, skipDawa);
  }
});

function getDawaSeqNum(client) {
  return client.queryp('SELECT MAX(sequence_number) as seqnum FROM transaction_history').then(result => result.rows[0].seqnum);
}

const importInitial = (client, txid, dataDir, skipDawa) => go(function*() {
  yield setInitialMeta(client);
  yield withDar1Transaction(client, 'initial', () => go(function*() {
    for (let entityName of ALL_DAR_ENTITIES) {
      const filePath = path.join(dataDir, ndjsonFileName(entityName));
      const tableName = postgresMapper.tables[entityName];
      yield streamToTable(client, entityName, filePath, tableName, true);
      const columns = postgresMapper.columns[entityName].join(', ');
      yield client.queryp(`INSERT INTO dar1_${entityName}_current(${columns}) (SELECT ${columns} FROM ${tableName}_current_view)`);
    }
    const maxEventId = yield getMaxEventId(client, '');
    yield setMeta(client, {last_event_id: maxEventId});
    if (!skipDawa) {
      yield updateDawa(client, txid);
    }
  }));
});

function clearDar(client) {
  return q.async(function*() {
    for (let table of _.values(postgresMapper.tables)) {
      yield client.queryBatched(`delete from ${table}`);
      yield client.queryBatched(`delete from ${table}_current`);

    }
    for (let table of ['dar1_changelog', 'dar1_transaction']) {
      yield client.queryBatched(`delete from ${table}`);
    }
    yield setMeta(client, {
      current_tx: null,
      last_event_id: null,
      virkning: null,
      prev_virkning: null
    });
    yield client.flush();
  })();
}

/**
 * Initializes the DAWA tables from DAR tables. DAWA tables must be empty. This will never run in production.
 */
const initDawa = (client, txid) => go(function*() {
  yield sqlCommon.disableTriggersQ(client);
  for (let entity of Object.keys(dawaSpec)) {
    const spec = dawaSpec[entity];
    const table = spec.table;
    const tableModel = tableModels.tables[table];
    const view = `dar1_${table}_view`;
    yield tableDiffNg.initializeFromScratch(client, txid, view, tableModel, spec.columns);
  }
  yield sqlCommon.enableTriggersQ(client);
  yield recomputeMaterializedDawa(client, txid);
  for (let temaSpec of temaer) {
    yield tema.updateAdresserTemaerView(client, temaSpec, true, 10000, false);
  }
});

/**
 * Perform a "full update" of DAWA tables, based on DAR1 tables
 * and the virkning time stored in dar1_meta table.
 * @param client
 * @param txid
 */
const updateDawa = (client, txid, nonPublicOverrides) => go(function*() {
  nonPublicOverrides = nonPublicOverrides || {};
  for (let entity of Object.keys(dawaSpec)) {
    const spec = dawaSpec[entity];
    const table = spec.table;
    let tableModel = tableModels.tables[table];
    if(nonPublicOverrides[table]) {
      tableModel = Object.assign({}, tableModel);
      tableModel.columns = tableModel.columns.map(column => {
        if(nonPublicOverrides[table][column.name]) {
          return Object.assign({}, column, {public: false});
        }
        else {
          return column;
        }
      });
    }
    yield tableDiffNg.computeDifferences(client, txid, `dar1_${table}_view`, tableModel, spec.columns);
  }
  yield sqlCommon.disableTriggersQ(client);
  yield applyDawaChanges(client, txid);
  yield recomputeMaterializedDawa(client, txid);
  yield sqlCommon.enableTriggersQ(client);
});

const applyDawaChanges = (client, txid) => go(function*() {
  for (let change of dawaChangeOrder) {
    const spec = dawaSpec[change.entity];
    const table = spec.table;
    const tableModel = tableModels.tables[table];
    if (change.type === 'insert') {
      yield tableDiffNg.applyInserts(client, txid, tableModel);
    }
    else if (change.type === 'update') {
      yield tableDiffNg.applyUpdates(client, txid, tableModel);
    }
    else if (change.type === 'delete') {
      yield tableDiffNg.applyDeletes(client, txid, tableModel);
    }
    else {
      throw new Error();
    }
  }
});

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
    'Adresse',
    'Husnummer',
    'DARKommuneinddeling',
    'NavngivenVej',
    'NavngivenVejKommunedel'
  ],
  navngivenvej_postnummer: [
    'NavngivenVejPostnummerRelation', 'NavngivenVej', 'Postnummer'
  ],
  vejstykke_postnummer: [
    'NavngivenVejKommunedel', 'Husnummer', 'NavngivenVej', 'DARKommuneinddeling', 'Postnummer'
  ],
  navngivenvej: [
    'NavngivenVej'
  ],
  vejpunkt: [
    'Adressepunkt', 'Husnummer'
  ]
};

function createFetchTable(client, tableName) {
  const fetchTable = `fetch_${tableName}`;
  return client.queryp(`create temp table ${fetchTable} (LIKE ${tableName})`);
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

function logDarChanges(client, entity) {
  return q.async(function*() {
    for (let op of ['insert', 'update', 'delete']) {
      yield client.queryBatched(`INSERT INTO dar1_changelog(tx_id, entity, operation, rowkey) \
(SELECT (select current_tx FROM dar1_meta) as tx_id, '${entity}', '${op}', rowkey FROM ${op}_${postgresMapper.tables[entity]})`);
    }
  })();
}

function applyDarDifferences(client, darEntities) {
  return q.async(function*() {
    for (let entity of darEntities) {
      const table = postgresMapper.tables[entity];
      const columns = postgresMapper.columns[entity];
      yield tablediff.applyChanges(client, table, table, ['rowkey'], columns, columns);
      yield logDarChanges(client, entity);
    }
  })();

}

/**
 * Start a DAR 1 transaction, and perform an incremental update based on a full dump from DAR 1.
 * @param client
 * @param dataDir
 * @param skipDawa
 * @returns {*}
 */
function importIncremental(client, txid, dataDir, skipDawa) {
  return withDar1Transaction(client, 'csv', () => {
    return q.async(function*() {
      yield copyDumpToTables(client, dataDir);
      yield computeDumpDifferences(client);
      yield applyIncrementalDifferences(client, txid, skipDawa, ALL_DAR_ENTITIES);
    })();
  });
}

/**
 * Given updated DAR tables, but the corresponding insert_, update_ and delete_ tables still present,
 * incrementially update the _current tables.
 * @param client
 * @returns {*}
 */
function computeIncrementalChangesToCurrentTables(client, darEntitiesWithNewRows, entitiesWithChangedVirkning) {
  return q.async(function*() {
    const allChangedEntities = _.union(darEntitiesWithNewRows, entitiesWithChangedVirkning);
    for (let entity of allChangedEntities) {
      const table = postgresMapper.tables[entity];
      const columns = postgresMapper.columns[entity];
      const currentTable = `${table}_current`;
      const currentTableView = `${currentTable}_view`;
      const dirtyTable = `dirty_${currentTable}`;
      const dirty = [];
      if (_.contains(darEntitiesWithNewRows, entity)) {
        dirty.push(['insert', 'update', 'delete']
          .map(prefix => `SELECT rowkey from ${prefix}_${table} `)
          .join(' UNION '));
      }
      if (_.contains(entitiesWithChangedVirkning, entity)) {
        dirty.push(`SELECT rowkey FROM ${table}, 
        (select prev_virkning from dar1_meta) as pv, 
        (select virkning as current_virkning from dar1_meta) as
      cv WHERE (prev_virkning <  lower(virkning) and current_virkning >= lower(virkning))
             or (prev_virkning <  upper(virkning) and current_virkning >= upper(virkning))`);
      }

      const selectDirty = dirty.join(' UNION ');
      yield client.queryp(`create temp table ${dirtyTable} as (${selectDirty})`);
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
SELECT id FROM insert_${currentTable}); ANALYZE ${dirtyTable}`);
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
      const unionSelectDirtys = selectDirtys ? `UNION ${selectDirtys}` : '';
      yield client.queryBatched(`WITH existing AS (SELECT ${dawaIdColumns.join(', ')} FROM dirty_${dawaTable}), \
dels AS (delete from dirty_${dawaTable})      
INSERT INTO dirty_${dawaTable}(${dawaIdColumns.join(', ')}) (select * from existing ${unionSelectDirtys})`);
      yield client.flush();
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

const updateDawaIncrementally = (client, txid) => go(function*() {
  for (let dawaEntity of Object.keys(dawaSpec)) {
    const spec = dawaSpec[dawaEntity];
    const table = spec.table;
    const tableModel = tableModels.tables[table];
    const dirtyTable = `dirty_${table}`;
    const view = `dar1_${table}_view`;
    yield tableDiffNg.computeDifferencesSubset(client, txid, view, dirtyTable, tableModel,
      spec.columns);
  }
  yield applyDawaChanges(client, txid);
  yield materializeDawa(client, txid);
});

function dropDawaDirtyTables(client) {
  return q.async(function*() {
    for (let dawaEntity of Object.keys(dawaSpec)) {
      yield importUtil.dropTable(client, `dirty_${dawaSpec[dawaEntity].table}`);
    }
  })();
}

function getChangedEntitiesDueToVirkningTime(client) {
  const entities = Object.keys(postgresMapper.tables);
  return q.async(function*() {
    const sql = 'SELECT ' + entities.map(entity => {
        const table = postgresMapper.tables[entity];
        return `(SELECT count(*) FROM ${table}, 
        (SELECT virkning as current_virkning FROM dar1_meta) cv,
        (select prev_virkning from dar1_meta) as pv
        WHERE (lower(virkning) > prev_virkning AND lower(virkning) <= current_virkning) or 
              (upper(virkning) > prev_virkning AND upper(virkning) <= current_virkning)
              ) > 0 as "${entity}"`;
      }).join(',');
    const queryResult = (yield client.queryRows(sql))[0];
    return Object.keys(queryResult).reduce((memo, entityName) => {
      if (queryResult[entityName]) {
        memo.push(entityName);
      }
      return memo;
    }, []);
  })();
}

/**
 * Compute the virkning time value we want to advance the database to. It is the greatest of
 * NOW()
 * registration time of any row
 * current virkning time
 * @param client
 * @param darEntitiesWithNewRows
 * @returns {*}
 */
function getNextVirkningTime(client, darEntitiesWithNewRows) {
  return q.async(function*() {
    const virkningTimeDb = (yield client.queryp('SELECT GREATEST((SELECT virkning from dar1_meta), NOW()) as time')).rows[0].time;

    if (darEntitiesWithNewRows.length === 0) {
      return virkningTimeDb;
    }
    const registrationTimeSelects = darEntitiesWithNewRows.map(entity => {
      const selectMaxRegistration = table => `select max(greatest(lower(registrering), upper(registrering))) FROM ${table}`;
      return `SELECT GREATEST((${selectMaxRegistration(`insert_dar1_${entity}`)}), (${selectMaxRegistration(`insert_dar1_${entity}`)}))`;
    });
    const selectMaxRegistrationQuery = `SELECT GREATEST((${registrationTimeSelects.join('),(')}))`;
    const virkningTimeChanges = (yield client.queryp(`${selectMaxRegistrationQuery} as v`)).rows[0].v;
    const latest = virkningTimeChanges ? moment.max(moment(virkningTimeDb), moment(virkningTimeChanges)) :
      moment(virkningTimeDb);
    return latest.toISOString();
  })();
}

/**
 * Advance virkning time in database to the time appropriate for the transaction.
 * It is the greatest value of:
 * 1) The current virkning time in db
 * 2) Current db clock time (SELECT NOW())
 * 3) Registration time of the transaction being processed.
 * @param client db client
 * @param darEntities the list of dar entities which has changes
 */
function advanceVirkningTime(client, darEntitiesWithNewRows, virkningTime) {
  return q.async(function*() {
    const prevVirkning = (yield getMeta(client)).virkning;
    const virkning = virkningTime ? virkningTime : yield getNextVirkningTime(client, darEntitiesWithNewRows);
    if(moment(prevVirkning).isAfter(moment(virkning))) {
      throw new Error("Cannot move back in virkning time");
    }
    yield setMeta(client, {prev_virkning: prevVirkning, virkning: virkning});
    return virkning;
  })();
}

/**
 * Apply a set of changes to DAR. The changes must already be stored in change tables.
 * @param client
 * @param skipDawaUpdate don't update DAWA tables
 * @param darEntities the list of dar entities which has changes
 * @returns {*}
 */
function applyIncrementalDifferences(client, txid, skipDawaUpdate, darEntitiesWithNewRows, virkningTime) {
  return q.async(function*() {
    yield advanceVirkningTime(client, darEntitiesWithNewRows, virkningTime);
    yield applyDarDifferences(client, darEntitiesWithNewRows);
    const entitiesChangedDueToVirkningTime = yield getChangedEntitiesDueToVirkningTime(client);
    if (darEntitiesWithNewRows.length === 0 && entitiesChangedDueToVirkningTime.length === 0) {
      return;
    }
    yield computeIncrementalChangesToCurrentTables(
      client,
      darEntitiesWithNewRows,
      entitiesChangedDueToVirkningTime);
    yield dropDarChangeTables(client, darEntitiesWithNewRows);
    const allChangedEntities = _.union(darEntitiesWithNewRows, entitiesChangedDueToVirkningTime);
    if (!skipDawaUpdate) {
      yield computeDirtyDarIds(client, allChangedEntities);
      yield createDirtyDawaTables(client);
      yield computeDirtyDawaIds(client, allChangedEntities);
    }
    yield applyChangesToCurrentDar(client, allChangedEntities);
    if (!skipDawaUpdate) {
      // due to the joining, some dirty DAWA ids is computed before changing the current dar tables,
      // and some are computed after
      yield computeDirtyDawaIds(client, allChangedEntities);
      const dirtyCounts = {};
      for(let entity of Object.keys(dawaSpec)) {
        const table = dawaSpec[entity].table;
        dirtyCounts[entity] = (yield client.queryRows(`analyze dirty_${table}; select count(*)  as c from dirty_${table}`))[0].c;
      }
      logger.info('Dirty counts', {
        dirtyCounts
      });
    }
    yield dropDarCurrentChangeTables(client, allChangedEntities);
    if (!skipDawaUpdate) {
      yield dropDirtyDarIdTables(client, allChangedEntities);
      yield updateDawaIncrementally(client, txid);
      yield dropDawaDirtyTables(client);
    }
  })();
}

function storeChangesetInFetchTables(client, changeset) {
  return q.async(function*() {
    for (let entityName of Object.keys(changeset)) {
      const rows = changeset[entityName];
      const targetTable = postgresMapper.tables[entityName];
      const mappedRows = rows.map(postgresMapper.createMapper(entityName, true));
      const fetchedTable = `fetch_${targetTable}`;
      const columns = postgresMapper.columns[entityName];
      yield createFetchTable(client, targetTable);
      yield importUtil.streamArrayToTable(client, mappedRows, fetchedTable, columns);
      yield copyEventIdsToFetchTable(client, fetchedTable, targetTable);
    }
  })();
}

/**
 * Import a collection of records to the database. Each record either represents
 * an insert or an update.
 * @param client
 * @param changeset
 * @param skipDawa
 * @returns {*}
 */
function importChangeset(client, txid, changeset, skipDawa, virkningTime) {
  const entities = Object.keys(changeset);
  return q.async(function*() {
    yield storeChangesetInFetchTables(client, changeset);
    for (let entity of entities) {
      const table = postgresMapper.tables[entity];
      yield client.queryp(`CREATE TEMP TABLE dirty_${table} AS (SELECT rowkey FROM fetch_${table})`);

      yield tablediff.computeDifferencesSubset(client, `dirty_${table}`, `fetch_${table}`, table, ['rowkey'], postgresMapper.columns[entity]);
      yield importUtil.dropTable(client, `dirty_${table}`);
      yield importUtil.dropTable(client, `fetch_${table}`);
    }
    yield applyIncrementalDifferences(client, txid, skipDawa, entities, virkningTime);
  })();
}

/**
 * Set up a DAR transaction by creating a transactionId and logging the DAWA sequence number.
 * After the transaction, we log some metadata (timestamp, source, and the DAWA modifications
 * produced by this transaction.
 * @param client
 * @param source
 * @param fn
 * @returns {*}
 */
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
  applyIncrementalDifferences: applyIncrementalDifferences,
  withDar1Transaction: withDar1Transaction,
  importChangeset: importChangeset,
  initDawa: initDawa,
  updateDawa: updateDawa,
  clearDar: clearDar,
  ALL_DAR_ENTITIES: ALL_DAR_ENTITIES,
  internal: {
    ALL_DAR_ENTITIES: ALL_DAR_ENTITIES,
    getMaxEventId: getMaxEventId,
    getMeta: getMeta,
    setInitialMeta: setInitialMeta
  }
};
