"use strict";

const path = require('path');
const {go} = require('ts-csp');
const q = require('q');
const _ = require('underscore');

const dar10TableModels = require('./dar10TableModels');
const importUtil = require('@dawadk/import-util/src/postgres-streaming');
const moment = require('moment');
const tableDiffNg = require('@dawadk/import-util/src/table-diff');
const postgresMapper = require('./postgresMapper');

const streamToTable = require('./streamToTable');
const tableModels = require('../psql/tableModel');
const materialize = require('@dawadk/import-util/src/materialize');
const {recomputeMaterializedDawa, materializeDawa} = require('../importUtil/materialize-dawa');
const { mergeValidTime } = require('../history/common');
const logger = require('@dawadk/common/src/logger').forCategory('darImport');

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

/**
 * We have a single-row table with some metadata about the dar1 import process.
 * last_event_id is the id of the last processed event from DAR1.
 * virkning is virkning time for computing DAWA values
 * @param client
 * @returns {*}
 */
const getMeta = client => go(function*() {
  return (yield client.queryRows('select * from dar1_meta'))[0];
});

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

const updatePostnumreKommunekoderMat = client => go(function*() {
  yield client.query(`DELETE FROM postnumre_kommunekoder_mat;
   insert into postnumre_kommunekoder_mat(postnr, kommunekode) (SELECT DISTINCT postnr, kommunekode FROM adgangsadresser where postnr is not null and kommunekode is not null)`);
});

const updateSupplerendeBynavne = (client, txid) => go(function*() {
  const tsvCol = _.findWhere(tableModels.tables.supplerendebynavne_mat.columns, {name: 'tsv'});
  yield client.query(`DELETE FROM supplerendebynavne_mat;
  INSERT INTO supplerendebynavne_mat(navn, tsv)
  (SELECT DISTINCT ON(navn) navn, ${tsvCol.derive('v')}
  FROM supplerendebynavne_mat_view v)`);
  yield client.query('DELETE FROM supplerendebynavn_kommune_mat;' +
    'INSERT INTO supplerendebynavn_kommune_mat(supplerendebynavn, kommunekode)' +
    '(SELECT supplerendebynavn, kommunekode from supplerendebynavn_kommune_mat_view)');
  yield client.query('DELETE FROM supplerendebynavn_postnr_mat;' +
    'INSERT INTO supplerendebynavn_postnr_mat(supplerendebynavn, postnr)' +
    '(SELECT supplerendebynavn, postnr from supplerendebynavn_postnr_mat_view)');
  yield materialize.recomputeMaterialization(client, txid, tableModels.tables, tableModels.materializations.supplerendebynavn2_postnr);
});



/**
 * Get maximum event id across all DAR1 tables
 * @param client
 * @returns {*}
 */
function getMaxEventId(client, tablePrefix, entityName) {
  const entities = entityName ? [entityName] : ALL_DAR_ENTITIES;
  const singleTableSql = (tableName) => `SELECT MAX(GREATEST(eventopret, eventopdater)) FROM ${tablePrefix + tableName}`;
  const list = entities.map(entityName => `(${singleTableSql(`dar1_${entityName}`)})`).join(', ');
  const sql = `select GREATEST(${list}) as maxeventid`;
  return client.queryp(sql).then(result => result.rows[0].maxeventid || 0);
}

function alreadyImported(client) {
  return client.queryp('select * from dar1_adressepunkt limit 1').then(result => result.rows.length > 0);
}

const importFromFiles = (client, txid, dataDir, skipDawa) => go(function* () {
  const hasAlreadyImported = yield alreadyImported(client);
  if (hasAlreadyImported) {
    yield importIncremental(client, txid, dataDir, skipDawa);
  }
  else {
    yield importInitial(client, txid, dataDir, skipDawa);
  }
});

const initializeDar10HistoryTables = (client, txid) => go(function*() {
  for(let entityName of Object.keys(dar10TableModels.historyTableModels)) {
    const rawTableModel = dar10TableModels.rawTableModels[entityName];
    const historyTableModel = dar10TableModels.historyTableModels[entityName];
    const historyColumnNames = historyTableModel.columns.map(column => column.name);
    yield client.query(`CREATE TEMP TABLE unmerged AS (
    SELECT null::integer as rowkey, ${_.without(historyColumnNames, 'rowkey')} FROM ${rawTableModel.table} WHERE upper_inf(registrering)); analyze unmerged`);
    yield mergeValidTime(client, 'unmerged', 'merged', ['id'], _.without(historyColumnNames, 'virkning'));
    yield client.query(`UPDATE merged SET rowkey = nextval('rowkey_sequence')`);
    yield client.query(`INSERT INTO ${historyTableModel.table}(${historyColumnNames.join(', ')}) (SELECT ${historyColumnNames.join(', ')} FROM merged)`);
    yield client.query(`DROP TABLE unmerged; DROP TABLE merged;`);
    yield client.query(`ANALYZE ${historyTableModel.table}`);
    yield tableDiffNg.initializeChangeTable(client, txid, historyTableModel);
  }
});

const importInitial = (client, txid, dataDir, skipDawa) => go(function* () {
  yield setInitialMeta(client);
  yield withDar1Transaction(client, 'initial', () => go(function* () {
    for (let entityName of ALL_DAR_ENTITIES) {
      const filePath = path.join(dataDir, ndjsonFileName(entityName));
      const tableName = dar10TableModels.rawTableModels[entityName].table;
      yield streamToTable(client, entityName, filePath, tableName, true);
      yield client.query(`ANALYZE ${tableName}`);
    }
    yield initializeDar10HistoryTables(client, txid);
    for (let entityName of ALL_DAR_ENTITIES) {
      yield materialize.materializeFromScratch(client, txid, tableModels.tables,
        dar10TableModels.currentTableMaterializations[entityName]);
    }
    const maxEventId = yield getMaxEventId(client, '');
    yield setMeta(client, {last_event_id: maxEventId});
    if (!skipDawa) {
      yield updateDawa(client, txid);
    }
  }));
});

function clearDar(client) {
  return q.async(function* () {
    for(let tableModel of [...Object.values(dar10TableModels.rawTableModels),
      ...Object.values(dar10TableModels.currentTableModels),
      ...Object.values(dar10TableModels.historyTableModels)]) {
      yield client.queryBatched(`delete from ${tableModel.table}; delete from ${tableModel.table}_changes`);
    }
    yield setMeta(client, {
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
const initDawa = (client, txid) => go(function* () {
  for(let entity of Object.keys(dar10TableModels.dawaMaterializations)) {
    yield materialize.materializeFromScratch(client, txid, tableModels.tables, dar10TableModels.dawaMaterializations[entity]);
  }
  yield recomputeMaterializedDawa(client, txid);
});

/**
 * Perform a "full update" of DAWA tables, based on DAR1 tables
 * and the virkning time stored in dar1_meta table.
 * @param client
 * @param txid
 */
const updateDawa = (client, txid) => go(function* () {
  yield rematerializeDawa(client,txid);
  yield updateSupplerendeBynavne(client, txid);
  yield updatePostnumreKommunekoderMat(client);

});

function createFetchTable(client, tableName) {
  const fetchTable = `fetch_${tableName}`;
  return client.queryp(`create temp table ${fetchTable} (LIKE ${tableName})`);
}

const copyEntityToTable = (client, entityName, dataDir) => go(function*(){
  const filePath = path.join(dataDir, ndjsonFileName(entityName));
  const tableName = dar10TableModels.rawTableModels[entityName].table;
  const fetchTable = `fetch_${tableName}`;
  yield createFetchTable(client, tableName);
  // Workaround for NavngivenVej:
  // Nogle navngivne veje kommer med z-koordinat for vejnavnelinjen. Det håndterer postgis
  // ikke i kolonner med SRID constraint. Derfor konverterer vi dem til 2D efter indlæsningen
  if(entityName === 'NavngivenVej') {
    yield client.query(`alter table ${fetchTable} alter vejnavnebeliggenhed_vejnavnelinje type geometry`);
  }
  yield streamToTable(client, entityName, filePath, fetchTable, true);
  if(entityName === 'NavngivenVej') {
    yield client.query(`alter table ${fetchTable} alter vejnavnebeliggenhed_vejnavnelinje type geometry(geometry, 25832) USING st_setsrid(st_force2d(vejnavnebeliggenhed_vejnavnelinje), 25832)`);
  }
});
function copyDumpToTables(client, dataDir) {
  return q.async(function* () {
    for (let entityName of ALL_DAR_ENTITIES) {
      yield copyEntityToTable(client, entityName, dataDir)
    }
  })()
}

function copyEventIdsToFetchTable(client, fetchTable, table) {
  return client.queryp(`UPDATE ${fetchTable} F 
      SET eventopret = COALESCE(f.eventopret, t.eventopret), 
      eventopdater = COALESCE(f.eventopdater, t.eventopdater) 
      FROM ${table} t WHERE f.rowkey = t.rowkey`);

}

const computeEntityDifferences = (client, txid, entityName, eventId) => go(function*(){
  const tableName = dar10TableModels.rawTableModels[entityName].table;
  const fetchTable = `fetch_${tableName}`;
  yield client.queryp(`CREATE UNIQUE INDEX ON ${fetchTable}(rowkey)`);
  // add/expire any rows added/expired after the dump was generated
  yield client.queryp(`INSERT INTO ${fetchTable} (SELECT * FROM ${tableName} 
      WHERE eventOpret > $1 OR eventopdater > $1) 
      ON CONFLICT (rowkey) DO UPDATE SET registrering = EXCLUDED.registrering`, [eventId]);
  // ensure we do not overwite eventopret and eventopdater with NULLs
  // DAR1 may discard them
  yield copyEventIdsToFetchTable(client, fetchTable, tableName);
  yield tableDiffNg.computeDifferences(client, txid, fetchTable, dar10TableModels.rawTableModels[entityName]);
  yield importUtil.dropTable(client, fetchTable);
  yield tableDiffNg.applyChanges(client, txid, dar10TableModels.rawTableModels[entityName]);
  const changes = (yield client.queryRows(`select count(*)::integer as c from ${dar10TableModels.rawTableModels[entityName].table}_changes where txid=$1`, [txid]))[0].c;
  logger.info('Gemte ændringer til rå DAR tabeller', {
    entityName,
    changes
  });
});
function computeDumpDifferences(client, txid) {
  return q.async(function* () {
    const eventId = yield getMaxEventId(client, 'fetch_');
    for (let entityName of ALL_DAR_ENTITIES) {
      yield computeEntityDifferences(client, txid, entityName, eventId);
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
    return q.async(function* () {
      yield copyDumpToTables(client, dataDir);
      yield computeDumpDifferences(client, txid);
      yield propagateIncrementalChanges(client, txid, skipDawa, ALL_DAR_ENTITIES);
    })();
  });
}

/**
 * Cannot just use materialize, because some dirty rows originate from change in current time.
 */
const materializeCurrent = (client, txid, entityName) => go(function* () {
  const materialization = dar10TableModels.currentTableMaterializations[entityName];
  const tableModel = dar10TableModels.currentTableModels[entityName];
  const rawTableModel = dar10TableModels.rawTableModels[entityName];
  yield materialize.computeDirty(client, txid, tableModels.tables, materialization);
  yield client.query(`INSERT INTO ${tableModel.table}_dirty
    (SELECT id FROM ${rawTableModel.table}, 
        (select prev_virkning from dar1_meta) as pv, 
        (select virkning as current_virkning from dar1_meta) as
      cv WHERE (prev_virkning <  lower(virkning) and current_virkning >= lower(virkning))
             or (prev_virkning <  upper(virkning) and current_virkning >= upper(virkning))
             EXCEPT (SELECT id from ${tableModel.table}_dirty))`);
  yield materialize.computeChanges(client, txid, tableModels.tables, materialization);
  yield tableDiffNg.applyChanges(client, txid, tableModel);
  yield materialize.dropTempDirtyTable(client, tableModel);
});

const materializeHistory = (client, txid, entity) => go(function*() {
  const historyTableModel = dar10TableModels.historyTableModels[entity];
  const historyTableColumnNames = historyTableModel.columns.map(column => column.name);
  const rawTableModel = dar10TableModels.rawTableModels[entity];
  yield client.query(`CREATE TEMP TABLE dirty AS (SELECT DISTINCT id FROM ${rawTableModel.table}_changes WHERE txid = ${txid})`);
  yield client.query(`CREATE TEMP TABLE unmerged AS (SELECT null::integer as rowkey, ${_.without(historyTableColumnNames, 'rowkey').join(', ')}
  FROM ${rawTableModel.table} NATURAL JOIN dirty WHERE upper_inf(registrering))`);
  yield mergeValidTime(client, 'unmerged', 'desired', ['id'], _.without(historyTableColumnNames, 'virkning'));
  yield client.query(`CREATE TEMP TABLE current AS (select * from ${historyTableModel.table} NATURAL JOIN dirty)`);
  yield client.query(`UPDATE desired SET rowkey = current.rowkey FROM current WHERE desired.id = current.id AND lower(desired.virkning) =  lower(current.virkning)`);
  yield client.query(`UPDATE desired SET rowkey = nextval('rowkey_sequence') WHERE rowkey IS NULL`);
  yield tableDiffNg.computeDifferencesView(client, txid, 'desired', 'current', historyTableModel);
  yield client.query('DROP TABLE dirty; DROP TABLE unmerged; DROP TABLE desired; DROP TABLE current');
  yield tableDiffNg.applyChanges(client, txid, historyTableModel);
});

const materializeHistoryDarTables =
  (client, txid, darEntitiesWithNewRows) => go(function* () {
    for (let entity of darEntitiesWithNewRows) {
      yield materializeHistory(client, txid, entity);
    }
  });

/**
 * Given updated DAR tables, but the corresponding insert_, update_ and delete_ tables still present,
 * incrementially update the _current tables.
 * @param client
 * @returns {*}
 */
const materializeCurrentDarTables =
  (client, txid, darEntitiesWithNewRows, entitiesWithChangedVirkning) => go(function* () {
    const allChangedEntities = _.union(darEntitiesWithNewRows, entitiesWithChangedVirkning);
    for (let entity of allChangedEntities) {
      yield materializeCurrent(client, txid, entity);
    }
  });

function getChangedEntitiesDueToVirkningTime(client) {
  const entities = Object.keys(dar10TableModels.rawTableModels);
  return q.async(function* () {
    const sql = 'SELECT ' + entities.map(entity => {
      const table = dar10TableModels.rawTableModels[entity].table;
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
function getNextVirkningTime(client, txid, darEntitiesWithNewRows) {
  return q.async(function* () {
    const virkningTimeDb = (yield client.queryp('SELECT GREATEST((SELECT virkning from dar1_meta), NOW()) as time')).rows[0].time;

    if (darEntitiesWithNewRows.length === 0) {
      return virkningTimeDb;
    }
    const registrationTimeSelects = darEntitiesWithNewRows.map(entity =>
       `select max(greatest(lower(registrering), upper(registrering))) FROM dar1_${entity}_changes WHERE txid = ${txid}`);
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
function advanceVirkningTime(client, txid, darEntitiesWithNewRows, virkningTime) {
  return q.async(function* () {
    const prevVirkning = (yield getMeta(client)).virkning;
    const virkning = virkningTime ? virkningTime : yield getNextVirkningTime(client, txid, darEntitiesWithNewRows);
    if (moment(prevVirkning).isAfter(moment(virkning))) {
      throw new Error("Cannot move back in virkning time");
    }
    yield setMeta(client, {prev_virkning: prevVirkning, virkning: virkning});
    return virkning;
  })();
}

const materializeDawaBaseTables = (client, txid) => go(function* () {
  for (let materializationTable  of dar10TableModels.dawaMaterializationOrder) {
    const materialization = dar10TableModels.dawaMaterializations[materializationTable];
    yield materialize.materialize(client, txid, tableModels.tables, materialization);
  }
});

const rematerializeDawa = (client, txid) => go(function*() {
  for (let entity of dar10TableModels.dawaMaterializationOrder) {
    let materialization = dar10TableModels.dawaMaterializations[entity];
    yield materialize.recomputeMaterialization(client, txid, tableModels.tables, materialization);
  }
  yield recomputeMaterializedDawa(client, txid);
});

/**
 * Called *before* metadata is updated to check if any entities changed due to advancing virkning time,
 * assuming that virkning time is advanced to current transaction timestamp
 * @param client
 * @returns {*}
 */
const hasChangedEntitiesDueToVirkningTime = (client) => go(function* () {
  const entities = Object.keys(dar10TableModels.rawTableModels);
  const sql = 'SELECT ' + entities.map(entity => {
    const table = dar10TableModels.rawTableModels[entity].table;
    return `(SELECT count(*) FROM ${table}, 
        (SELECT virkning as prev_virkning FROM dar1_meta) cv
        WHERE (lower(virkning) > prev_virkning AND lower(virkning) <= now()) or 
              (upper(virkning) > prev_virkning AND upper(virkning) <= now())
              ) > 0 as "${entity}"`;
  }).join(',');
  const queryResult = (yield client.queryRows(sql))[0];
  const changedEntities = Object.keys(queryResult).reduce((memo, entityName) => {
    if (queryResult[entityName]) {
      memo.push(entityName);
    }
    return memo;
  }, []);
  return changedEntities.length > 0;
});

/**
 * Propagate changes to DAR 1.0 raw tables to all derived tables.
 * @param client
 * @param skipDawaUpdate don't update DAWA tables
 * @param darEntities the list of dar entities which has changes
 * @returns {*}
 */
const propagateIncrementalChanges =
  (client, txid, skipDawaUpdate, darEntitiesWithNewRows, virkningTime) => go(function* () {
    yield advanceVirkningTime(client, txid, darEntitiesWithNewRows, virkningTime);
    const entitiesChangedDueToVirkningTime = yield getChangedEntitiesDueToVirkningTime(client);
    if (darEntitiesWithNewRows.length === 0 && entitiesChangedDueToVirkningTime.length === 0) {
      return;
    }
    yield materializeHistoryDarTables(client, txid, darEntitiesWithNewRows);
    yield materializeCurrentDarTables(
      client,
      txid,
      darEntitiesWithNewRows,
      entitiesChangedDueToVirkningTime);
    if (!skipDawaUpdate) {
      yield materializeDawaBaseTables(client, txid);
      yield materializeDawa(client, txid);
    }
  });

function storeChangesetInFetchTables(client, changeset) {
  return q.async(function* () {
    for (let entityName of Object.keys(changeset)) {
      const rows = changeset[entityName];
      const tableModel = dar10TableModels.rawTableModels[entityName];
      const targetTable = tableModel.table;
      const mappedRows = rows.map(postgresMapper.createMapper(entityName, true));
      const fetchedTable = `fetch_${targetTable}`;
      const columns = dar10TableModels.rawTableModels[entityName].columns.map(column => column.name);
      yield createFetchTable(client, targetTable);
      yield importUtil.streamArrayToTable(client, mappedRows, fetchedTable, columns);
      yield copyEventIdsToFetchTable(client, fetchedTable, targetTable);
    }
  })();
}

const mergeOpretUpdateRows = changeset => {
  const newChangeset = {};
  for(let [entity, rows] of Object.entries(changeset)) {
    const grouped = _.groupBy(rows, 'rowkey');
    const result = Object.values(grouped).map(([firstRow, secondRow])=> {
      if(!secondRow) {
        return firstRow;
      }
      else if(secondRow.eventopdater) {
        return Object.assign({}, secondRow, {eventopret: firstRow.eventopret});
      }
      else {
        return Object.assign({}, firstRow, {eventopret: secondRow.eventopret});
      }
    });
    newChangeset[entity] = result;
  }
  return newChangeset;
};

/**
 * Import a collection of records to the database. Each record either represents
 * an insert or an update.
 * @param client
 * @param changeset
 * @param skipDawa
 * @returns {*}
 */
function importChangeset(client, txid, changeset, skipDawa, virkningTime) {
  changeset = mergeOpretUpdateRows(changeset);
  const entities = Object.keys(changeset);
  return q.async(function* () {
    yield storeChangesetInFetchTables(client, changeset);
    for (let entity of entities) {
      const tableModel = dar10TableModels.rawTableModels[entity];
      const fetchTable = `fetch_${tableModel.table}`;
      const dirtyTable = `dirty${tableModel.table}`;
      yield client.queryp(`CREATE TEMP TABLE ${dirtyTable} AS (SELECT rowkey FROM ${fetchTable})`);
      yield tableDiffNg.computeDifferencesSubset(client, txid, fetchTable, dirtyTable,tableModel );
      yield tableDiffNg.applyChanges(client, txid, dar10TableModels.rawTableModels[entity]);
      yield importUtil.dropTable(client, dirtyTable);
      yield importUtil.dropTable(client, fetchTable);
    }
    yield propagateIncrementalChanges(client, txid, skipDawa, entities, virkningTime);
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
  return q.async(function* () {
    yield fn();
  })();
}

module.exports = {
  importFromFiles: importFromFiles,
  hasChangedEntitiesDueToVirkningTime,
  importInitial,
  importIncremental,
  applyIncrementalDifferences: propagateIncrementalChanges,
  withDar1Transaction: withDar1Transaction,
  importChangeset,
  initDawa: initDawa,
  updateDawa,
  clearDar,
  ALL_DAR_ENTITIES: ALL_DAR_ENTITIES,
  internal: {
    getMeta,
    initializeDar10HistoryTables,
    ALL_DAR_ENTITIES: ALL_DAR_ENTITIES,
    getMaxEventId: getMaxEventId,
    setInitialMeta: setInitialMeta,
    removeRedundantOpretRows: mergeOpretUpdateRows,
  },
  copyEntityToTable,
  computeEntityDifferences,
  getMaxEventId

};
