const { go } = require('ts-csp');
const moment = require('moment');
const dar10TableModels = require('./dar10TableModels');
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




/**
 * Compute the virkning time value we want to advance the database to. It is the greatest of
 * NOW()
 * registration time of any row
 * current virkning time
 * @param client
 * @param darEntitiesWithNewRows
 * @returns {*}
 */
const  getNextVirkningTime = (client, txid, darEntitiesWithNewRows)  =>go(function*() {
  const virkningTimeDb = (yield client.queryp('SELECT GREATEST((SELECT virkning from dar1_meta), NOW()) as time')).rows[0].time;
  if (darEntitiesWithNewRows.length === 0) {
    return virkningTimeDb;
  }
  const registrationTimeSelects = darEntitiesWithNewRows.map(entity =>
    `select max(lower(registrering)) FROM dar1_${entity}_changes WHERE txid = ${txid}`);
  const selectMaxRegistrationQuery = `SELECT GREATEST((${registrationTimeSelects.join('),(')}))`;
  const virkningTimeChanges = (yield client.queryp(`${selectMaxRegistrationQuery} as v`)).rows[0].v;
  // We have previously received invalid registration times far in the future. We ignore the registration time of the changeset if the registration time is beyond 1 minute into the future.
  const virkningTimeChangesValid = virkningTimeChanges &&
    moment(virkningTimeDb).add(2, 'minute').isAfter(moment(virkningTimeChanges));
  const latest = virkningTimeChangesValid ? moment.max(moment(virkningTimeDb), moment(virkningTimeChanges)) :
    moment(virkningTimeDb);
  return latest.toISOString();
});

const setVirkningTime = (client, virkningTime) => go(function*() {
  const prevVirkning = (yield getMeta(client)).virkning;
  if (moment(prevVirkning).isAfter(moment(virkningTime))) {
    throw new Error("Cannot move back in virkning time");
  }
  yield setMeta(client, {prev_virkning: prevVirkning, virkning: virkningTime});
});

/**
 * Advance virkning time in database to the time appropriate for the transaction.
 * It is the greatest value of:
 * 1) The current virkning time in db
 * 2) Current db clock time (SELECT NOW())
 * 3) Registration time of the transaction being processed.
 * @param client db client
 * @param darEntities the list of dar entities which has changes
 */
const advanceVirkningTime = (client, txid, darEntitiesWithNewRows) => go(function*() {
  const newVirkningTime = yield getNextVirkningTime(client, txid, darEntitiesWithNewRows);
  yield setVirkningTime(client, newVirkningTime);
  return newVirkningTime;
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

function createFetchTable(client, tableName) {
  const fetchTable = `fetch_${tableName}`;
  return client.queryp(`create temp table ${fetchTable} (LIKE ${tableName})`);
}

function copyEventIdsToFetchTable(client, fetchTable, table) {
  return client.queryp(`UPDATE ${fetchTable} F 
      SET eventopret = COALESCE(f.eventopret, t.eventopret), 
      eventopdater = COALESCE(f.eventopdater, t.eventopdater) 
      FROM ${table} t WHERE f.rowkey = t.rowkey`);

}

module.exports = {
  getMeta, setMeta, setInitialMeta, ALL_DAR_ENTITIES, getMaxEventId, advanceVirkningTime,
  hasChangedEntitiesDueToVirkningTime,getNextVirkningTime,
  createFetchTable, copyEventIdsToFetchTable,
  setVirkningTime
};
