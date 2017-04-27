"use strict";

const stream = require('stream');
const util = require('util');
const q = require('q');
const _ = require('underscore');

const dbapi = require('../dbapi');
const extendStreetIntervals = require('./extendStreetIntervals');
const extendVejnavnIntervals = require('./extendVejnavnIntervals');
const promisingStreamCombiner = require('../promisingStreamCombiner');
const {allColumnNames, } = require('../importUtil/tableModelUtil');
const sqlUtil = require('../darImport/sqlUtil');
const tableModels = require('../psql/tableModel');

const Transform = stream.Transform;
const Writable = stream.Writable;

util.inherits(ExtendStreetIntervalTransformer, Transform);
function ExtendStreetIntervalTransformer(refify, unrefify) {
  Transform.call(this, {objectMode: true});
  this.refify = refify;
  this.unrefify = unrefify;
}

ExtendStreetIntervalTransformer.prototype._transform = function(street, encoding, callback) {
  const intervals = street.intervals;
  const extendedIntervals = extendStreetIntervals(intervals, this.refify, this.unrefify);
  const records = extendedIntervals.map(interval => {
    var result = _.extend({}, interval, {
      kommunekode: street.kommunekode,
      vejkode: street.vejkode,
      side: street.side
    });
    result.virkning = result.virkning.toPostgres();
    result.husnrinterval = result.husnrinterval.toPostgres();
    return result;
  });
  records.forEach(record => {
    this.push(record);
  });
  callback();
};

util.inherits(TableInserter, Writable);
function TableInserter(client, table, columns) {
  Writable.call(this, {objectMode: true});
  this.client = client;
  this.table = table;
  this.columns = columns;
}

TableInserter.prototype._write = function(row, encoding, callback) {
  this._writev([{chunk: row}], callback);
}

TableInserter.prototype._writev = function(chunks, callback) {
  const rows = _.pluck(chunks, 'chunk');
  const parameters = [];
  var valueRows = rows.map((row) => {
    var values = [];
    this.columns.forEach(col => {
      var value = row[col];
      parameters.push(value);
      values.push('$' + parameters.length);
    });
    return '(' + values.join(',') + ')';
  });
  this.client.query(
    `INSERT INTO ${this.table} (${this.columns.join(',')}) VALUES ${valueRows.join(',')}`,
    parameters).asPromise().nodeify(callback);
};

const createTempHistoryTable = (client, tableModel) => {
  const partitionClause = sqlUtil.selectList(null, tableModel.primaryKey);
  const subselect = `select *, last_value(changeid) OVER (PARTITION BY ${partitionClause} ORDER BY changeid ROWS BETWEEN CURRENT ROW AND 1 FOLLOWING) as next_valid from ${tableModel.table}_changes`;
  const selectClause = sqlUtil.selectList(null, allColumnNames(tableModel));
  const select =
    `select changeid as valid_from, CASE WHEN next_valid = changeid THEN NULL ELSE next_valid END as valid_to, ${selectClause}
     FROM (${subselect}) t WHERE operation <> 'delete'`;
  return client.query(`CREATE TEMP TABLE ${tableModel.table}_history AS (${select})`);
};

util.inherits(ExtendVejnavnTransformer, Transform);
function ExtendVejnavnTransformer() {
  Transform.call(this, {objectMode: true});
}

ExtendVejnavnTransformer.prototype._transform = function(street, encoding, callback) {
  const result = extendVejnavnIntervals(street);
  for(let interval of result) {
    this.push(interval);
  }
  callback();
};


function createHeadTailTempTable(client, tableName, htsTableName, idColumns, columns, bitemporal) {
  var selectIds = sqlUtil.selectList(tableName, idColumns.concat('virkning'));
  var selectHead = "(lag(virkning, 1) OVER w) IS NULL OR COALESCE(upper(lag(virkning, 1) OVER w) <> lower(virkning), TRUE) AS head";
  var selectTail = "(lead(virkning, 1) OVER w) IS NULL OR COALESCE(lower(lead(virkning, 1) OVER w) <> upper(virkning), TRUE) AS tail";
  var window = `WINDOW w AS (PARTITION BY ${columns.join(', ')} ORDER BY lower(virkning))`;
  var whereClause = bitemporal ? " WHERE upper(registrering) IS NULL" : "";
  var selectQuery = `SELECT ${selectIds}, ${selectHead}, ${selectTail} FROM ${tableName} ${whereClause} ${window}`;
  var sql = `CREATE TEMP TABLE ${htsTableName} AS (${selectQuery})`;
  sql += `; CREATE INDEX ON ${htsTableName}(${idColumns.join(', ')})`;
  return client.queryp(sql);

}

function mergeValidTime(client, tableName, targetTableName, idColumns, columns, bitemporal) {
  return q.async(function* () {
    var htsTableName = tableName + "_hts";
    yield createHeadTailTempTable(client, tableName, htsTableName, idColumns, columns, bitemporal);
    var subselect =
      `SELECT upper(ht2.virkning)
     FROM ${htsTableName} ht2
     WHERE ${sqlUtil.columnsEqualClause('ht', 'ht2', idColumns)}
      AND ht2.tail AND lower(ht2.virkning) >= lower(ht.virkning) ORDER BY ${columns.join(', ')}, lower(virkning) LIMIT 1`
    var select = `SELECT ${sqlUtil.selectList('tab', columns)},
  tstzrange(lower(ht.virkning),
  (${subselect}), '[)') as virkning
  FROM ${htsTableName} ht
  JOIN ${tableName} tab ON ${sqlUtil.columnsEqualClause('ht', 'tab', idColumns)} AND ht.virkning = tab.virkning ${bitemporal ? ' AND upper(tab.registrering) IS NULL' : ''}
  WHERE ht.head`;
    var sql = `CREATE TEMP TABLE ${targetTableName} AS (${select})`;
    yield client.queryp(sql);
    yield client.queryp(`DROP TABLE ${htsTableName}`);
  })();
}

function createPostnummerIntervalHistory(client, postnummerIntervalHistoryTable) {
  return q.async(function*() {
    // WORKAROUND: we disable hash aggregates, because there seems to be a bug in Postgres (as of 9.4) where
    // it attempts to hash aggregate composite types, which does not have a hash function, causing
    // the query to fail
    yield client.queryp('SET enable_hashagg=false');
    yield client.queryp('DELETE FROM vask_postnrinterval');
    const intervalSql = `SELECT kommunekode, vejkode, side, json_agg(json_build_object('nr', nr, 'husnrstart', lower(husnrinterval), 'husnrslut', upper(husnrinterval), 'virkningstart', lower(virkning), 'virkningslut', upper(virkning))) as intervals
FROM ((SELECT
        kommunekode,
        vejkode,
        husnrinterval,
        side,
        nr,
        virkning
      FROM cpr_postnr)
UNION (SELECT
         kommunekode,
         vejkode,
         husnrinterval,
         side,
         postdistriktnummer as nr,
         registrering AS virkning
       FROM dar_postnr WHERE ophoerttimestamp IS NULL AND side IS NOT NULL)) as p GROUP BY kommunekode, vejkode, side ORDER BY kommunekode, vejkode, side;
`;
    const intervalStream = yield dbapi.streamRaw(client, intervalSql, []);
    let postnrRefify = (interval) => interval.nr;
    let postnrUnrefify = (ref) => { return { nr: ref } };
    const postnrExtender = new ExtendStreetIntervalTransformer(postnrRefify, postnrUnrefify);
    const columns = ['kommunekode', 'vejkode', 'side', 'husnrinterval', 'nr','virkning'];
    yield promisingStreamCombiner([
      intervalStream,
      postnrExtender,
      new TableInserter(client, postnummerIntervalHistoryTable, columns)
    ]);
    yield client.queryp('SET enable_hashagg=true');

  })();
}

function createVejnavnHistory(client) {
  return q.async(function*() {
    yield client.queryp('delete from vask_vejnavn');
    const intervalSql = `SELECT kommunekode, vejkode,
  json_agg(json_build_object('navn', navn,
                             'adresseringsnavn', adresseringsnavn,
                             'virkningstart', lower(virkning),
                             'virkningslut', upper(virkning))) as intervals
FROM ((SELECT kommunekode, vejkode, navn, adresseringsnavn, virkning FROM cpr_vej) UNION
(SELECT kommunekode, vejkode, navn, adresseringsnavn, registrering as virkning FROM dar_vejnavn WHERE ophoerttimestamp IS NULL)) AS t
WHERE navn IS NOT NULL and navn <> '' and adresseringsnavn IS NOT NULL AND vejkode < 9900
GROUP BY kommunekode, vejkode;`;
    const intervalStream = yield dbapi.streamRaw(client, intervalSql, []);
    const columns = ['kommunekode', 'vejkode', 'navn', 'adresseringsnavn', 'virkning'];

    yield promisingStreamCombiner([
      intervalStream,
      new ExtendVejnavnTransformer(),
      new TableInserter(client, 'vask_vejnavn', columns)
    ]);
  })();
}

function createPostnumreHistory(client) {
  return q.async(function*() {
    yield createTempHistoryTable(client, tableModels.tables.postnumre);
    yield client.queryp('DELETE FROM vask_postnumre');
    yield client.queryp(`INSERT INTO vask_postnumre(nr, navn, virkning) (SELECT nr, navn, \
tstzrange((CASE WHEN tf.time < '2016-01-01' THEN NULL ELSE tf.time END),tt.time, '[)') as virkning\    
FROM postnumre_history p \
LEFT JOIN transaction_history tf ON p.valid_from = tf.sequence_number \
LEFT JOIN transaction_history tt ON p.valid_to = tt.sequence_number)`);
  })();
}

function createVejstykkerPostnumreHistory(client) {
  return client.queryp(`
DELETE FROM vask_vejstykker_postnumre;    
INSERT INTO vask_vejstykker_postnumre (SELECT DISTINCT
                                         vask_vejnavn.kommunekode,
                                         vask_vejnavn.vejkode,
                                         vask_vejnavn.navn               AS vejnavn,
                                         vask_postnrinterval.nr          AS postnr,
                                         vask_vejnavn.navn || ' ' || vask_postnrinterval.nr || ' '
                                         || vp.navn AS tekst
                                       FROM vask_vejnavn
                                         JOIN vask_postnrinterval
                                           ON vask_vejnavn.virkning && vask_postnrinterval.virkning
                                              AND vask_vejnavn.kommunekode =
                                                  vask_postnrinterval.kommunekode
                                              AND vask_vejnavn.vejkode = vask_postnrinterval.vejkode
                                         JOIN vask_postnumre vp
                                           ON vask_postnrinterval.nr = vp.nr
                                           AND vask_postnrinterval.virkning && vp.virkning);
INSERT INTO vask_vejstykker_postnumre (SELECT DISTINCT
                                         vask_vejnavn.kommunekode,
                                         vask_vejnavn.vejkode,
                                         vask_vejnavn.adresseringsnavn   AS vejnavn,
                                         vask_postnrinterval.nr          AS postnr,
                                         vask_vejnavn.navn || ' ' || vp.nr || ' '
                                         || vp.navn AS tekst
                                       FROM vask_vejnavn
                                         JOIN vask_postnrinterval
                                           ON vask_vejnavn.virkning && vask_postnrinterval.virkning
                                              AND vask_vejnavn.kommunekode =
                                                  vask_postnrinterval.kommunekode
                                              AND vask_vejnavn.vejkode = vask_postnrinterval.vejkode
                                         JOIN vask_postnumre vp
                                           ON vask_postnrinterval.nr = vp.nr
                                           AND vask_postnrinterval.virkning && vp.virkning
                                       WHERE vask_vejnavn.adresseringsnavn <> vask_vejnavn.navn);
INSERT INTO vask_vejstykker_postnumre (SELECT DISTINCT
                                         vask_vejnavn.kommunekode,
                                         vask_vejnavn.vejkode,
                                         vask_vejnavn.navn               AS vejnavn,
                                         vp.nr AS postnr,
                                         vask_vejnavn.navn || ' ' || vp.nr || ' '
                                         || vp.navn AS tekst
                                       FROM vask_vejnavn
                                         JOIN vask_adgangsadresser a
                                           ON vask_vejnavn.kommunekode = a.kommunekode
                                              AND vask_vejnavn.vejkode = a.vejkode
                                              AND vask_vejnavn.virkning && a.virkning
                                         JOIN stormodtagere s
                                           ON a.id = s.adgangsadresseid
                                         JOIN vask_postnumre vp
                                           ON s.nr = vp.nr
                                              AND vask_vejnavn.virkning && vp.virkning);

DELETE FROM vask_vejstykker_postnumre  vp WHERE NOT EXISTS(select * from vask_adgangsadresser a where vp.kommunekode = a.kommunekode and vp.vejkode = a.vejkode);
`);
}

function prepareAdgangspunkt(client, adgangspunktHistoryTable) {
  return q.async(function*() {
    const adgangspunktHistoryUnmerged = 'adgangspunkt_history_unmerged';
    yield client.queryp(`CREATE TEMP TABLE ${adgangspunktHistoryUnmerged} AS
  (SELECT id, statuskode, kommunenummer, virkning FROM dar_adgangspunkt WHERE upper(registrering) IS NULL)`);

    // adgangspunkter fandtes ikke før 2009. Vi laver fiktive adgangspunkter for den periode,
    // for at sikre at den kombinerede historik for adgangspunkter og husnumre går helt tilbage
    // til husnummerets oprettelse
    yield client.queryp(`WITH
    hn AS
  (SELECT
     adgangspunktid,
     min(lower(virkning)) AS virkningstart
   FROM dar_husnummer hn
   WHERE upper(hn.registrering) IS NULL
   GROUP BY adgangspunktid),
    ap AS
  (SELECT
     id,
     kommunenummer,
     min(lower(virkning)) AS virkningstart
   FROM dar_adgangspunkt
   WHERE upper(registrering) IS NULL
   GROUP BY id, kommunenummer),
    missing AS
  (SELECT
     ap.id AS id,
     NULL :: SMALLINT as statuskode,
     kommunenummer,
     tstzrange(hn.virkningstart, ap.virkningstart, '[)') as virkning
   FROM hn
     JOIN ap ON hn.adgangspunktid = ap.id
   WHERE hn.virkningstart < (ap.virkningstart))
INSERT INTO ${adgangspunktHistoryUnmerged} (SELECT * FROM missing);`);
    yield mergeValidTime(client, adgangspunktHistoryUnmerged, adgangspunktHistoryTable, ['id'], ['id', 'statuskode', 'kommunenummer'], false);
  })();
}

function mergeAdgangspunktHusnummer(client, mergedTable) {
  return q.async(function*() {
    var adgangspunktHistoryTable = 'adgangspunkt_history';
    var husnummerHistoryTable = 'husnummer_history';
    var joinedTable = 'joined_adgangsadresser_history';
    yield prepareAdgangspunkt(client, adgangspunktHistoryTable);
    yield mergeValidTime(client, 'dar_husnummer', husnummerHistoryTable, ['id'], ['id', 'bkid', 'statuskode', 'adgangspunktid', 'vejkode', 'husnummer'], true);
    var query =
      `SELECT hn.id, hn.bkid, hn.statuskode as hn_statuskode,
   ap.statuskode as ap_statuskode, hn.adgangspunktid, ap.kommunenummer as kommunekode,
   hn.vejkode, hn.husnummer as husnr,
   hn.virkning * COALESCE(ap.virkning, hn.virkning) as virkning
  FROM ${husnummerHistoryTable} hn LEFT JOIN ${adgangspunktHistoryTable} ap
   ON hn.adgangspunktid = ap.id AND hn.virkning && ap.virkning`;
    yield client.queryp(`CREATE TEMP TABLE ${joinedTable} AS (${query})`);
    yield client.queryp(`DROP TABLE ${adgangspunktHistoryTable}; DROP TABLE ${husnummerHistoryTable}`);
    yield mergeValidTime(client, joinedTable, mergedTable, ['id'], ['id', 'bkid', 'hn_statuskode', 'ap_statuskode', 'adgangspunktid', 'kommunekode', 'vejkode', 'husnr'], false);
    yield client.queryp(`DROP TABLE ${joinedTable}`);
  })();
}

function mergeVejnavn(client, srcTable, mergedTable) {
  var unmergedTable = mergedTable + '_unmerged';
  return q.async(function*() {
    const src1Columns = ['id', 'bkid', 'hn_statuskode', 'ap_statuskode', 'adgangspunktid', 'kommunekode', 'vejkode', 'husnr'];
    const src2Columns = ['navn as vejnavn', 'adresseringsnavn as adresseringsvejnavn'];
    const query = `CREATE TEMP TABLE ${unmergedTable} AS(select ${sqlUtil.selectList(srcTable, src1Columns)}, ${src2Columns.join(',')},
     ${srcTable}.virkning * vask_vejnavn.virkning as virkning
    FROM ${srcTable} JOIN vask_vejnavn ON ${srcTable}.kommunekode = vask_vejnavn.kommunekode
    AND ${srcTable}.vejkode = vask_vejnavn.vejkode
    AND ${srcTable}.virkning && vask_vejnavn.virkning)`;
    yield client.queryp(query);
    yield mergeValidTime(client, unmergedTable, mergedTable, ['id'], src1Columns.concat(['vejnavn', 'adresseringsvejnavn']), false);
    yield client.queryp(`DROP TABLE ${unmergedTable}`);
  })();
}

function mergePostnr(client, srcTable, mergedTable) {
  var unmergedTable = mergedTable + '_unmerged';
  return q.async(function*() {
    const src1Columns = ['id', 'bkid', 'hn_statuskode', 'ap_statuskode', 'adgangspunktid', 'kommunekode', 'vejkode', 'husnr', 'vejnavn', 'adresseringsvejnavn'];
    const subselect = `FROM vask_postnrinterval pi
     WHERE ${srcTable}.kommunekode = pi.kommunekode
      AND ${srcTable}.vejkode = pi.vejkode
      AND pi.side = (CASE WHEN (${srcTable}.husnr).tal % 2 = 0 THEN 'L'
                     ELSE 'U' END)
      AND husnr <@ pi.husnrinterval  AND ${srcTable}.virkning && pi.virkning LIMIT 1`;
    const query = `CREATE TEMP TABLE ${unmergedTable} AS(select ${sqlUtil.selectList(srcTable, src1Columns)},
     (SELECT nr ${subselect}) AS postnr,
     ${srcTable}.virkning * (SELECT pi.virkning ${subselect}) as virkning FROM ${srcTable}
     WHERE EXISTS (SELECT * ${subselect}))`;
    yield client.queryp(query);
    const postnrNavnTable = mergedTable + '_postnrnavn';
    const mergedColumns = src1Columns.concat(['postnr']);
    const resultColumns = mergedColumns.concat(['postnrnavn']);
    yield client.queryp(
      `CREATE TEMP TABLE ${postnrNavnTable} AS \
(SELECT ${mergedColumns.join(',')}, vp.navn as postnrnavn, \
u.virkning * vp.virkning as virkning \
FROM ${unmergedTable} u \
JOIN vask_postnumre vp \
ON u.postnr = vp.nr AND u.virkning && vp.virkning)`);
    yield mergeValidTime(client, postnrNavnTable, mergedTable, ['id'], resultColumns, false);
  })();
}

function generateAdgangsadresserHistory(client) {
  return q.async(function*() {
    yield createVejnavnHistory(client);
    yield createPostnumreHistory(client);
    yield createPostnummerIntervalHistory(client, 'vask_postnrinterval');
    var mergedTable = 'merged_adgangsadresser_history';
    const mergedTableWithVejnavn = 'adgangsadresser_vejnavne_history';
    const mergedTableWithPostnr = 'adgangsadresser_postnumre_history';
    yield mergeAdgangspunktHusnummer(client, mergedTable);
    yield mergeVejnavn(client, mergedTable, mergedTableWithVejnavn);
    yield client.queryp(`DROP TABLE ${mergedTable}`);
    yield mergePostnr(client, mergedTableWithVejnavn, mergedTableWithPostnr);
    yield client.queryp(`DROP TABLE ${mergedTableWithVejnavn}`);
    var query = `SELECT
    m.bkid               AS id,
    m.id AS hn_id,
    ap_statuskode,
    hn_statuskode,
    m.kommunekode,
    m.vejkode,
    vejnavn,
    adresseringsvejnavn,
    husnr,
    sb.bynavn             AS supplerendebynavn,
    m.postnr,
    m.postnrnavn,
    m.virkning
  FROM ${mergedTableWithPostnr} m
    LEFT JOIN dar_supplerendebynavn_current sb
      ON m.kommunekode = sb.kommunekode
         AND m.vejkode = sb.vejkode
         AND sb.side = (CASE WHEN (m.husnr).tal % 2 = 0
      THEN 'L'
                        ELSE 'U' END)
         AND m.husnr <@ sb.husnrinterval
`;
    yield client.queryp(`DELETE FROM vask_adgangsadresser; INSERT INTO vask_adgangsadresser (${query})`);
    yield client.queryp(`DROP TABLE ${mergedTableWithPostnr}`);
    yield client.queryp('DELETE FROM vask_adgangsadresser_unikke');
    yield client.queryp(`
INSERT INTO vask_adgangsadresser_unikke (id, vejnavn, husnr, postnr, postnrnavn)
  (SELECT DISTINCT
     id,
     vejnavn,
     husnr,
     postnr,
     postnrnavn
   FROM
     vask_adgangsadresser);

INSERT INTO vask_adgangsadresser_unikke (id, vejnavn, husnr, supplerendebynavn, postnr, postnrnavn)
  (SELECT DISTINCT
     id,
     vejnavn,
     husnr,
     supplerendebynavn,
     postnr,
     postnrnavn
   FROM
     vask_adgangsadresser
   WHERE supplerendebynavn IS NOT NULL);

INSERT INTO vask_adgangsadresser_unikke (id, vejnavn, husnr, postnr, postnrnavn)
  (SELECT DISTINCT
     id,
     adresseringsvejnavn,
     husnr,
     postnr,
     postnrnavn
   FROM
     vask_adgangsadresser
   WHERE adresseringsvejnavn <> vejnavn);

INSERT INTO vask_adgangsadresser_unikke (id, vejnavn, husnr, supplerendebynavn, postnr, postnrnavn)
  (SELECT DISTINCT
     id,
     adresseringsvejnavn,
     husnr,
     supplerendebynavn,
     postnr,
     postnrnavn
   FROM
     vask_adgangsadresser
   WHERE supplerendebynavn IS NOT NULL AND adresseringsvejnavn <> vejnavn);
INSERT INTO vask_adgangsadresser_unikke (id, vejnavn, husnr, supplerendebynavn, postnr, postnrnavn)
  (SELECT
     v.id,
     v.vejnavn,
     v.husnr,
     v.supplerendebynavn,
     s.nr   AS postnr,
     s.navn AS postnrnavn
   FROM vask_adgangsadresser_unikke v JOIN stormodtagere s ON v.id = s.adgangsadresseid);
`);
    yield client.queryp('SELECT vask_adgangsadresser_unikke_update_tsv()');
    yield createVejstykkerPostnumreHistory(client);
  })();
}

function generateAdresserHistory(client) {
  return q.async(function*() {
    var adresseHistoryTable = 'adresse_history';
    var unmerged = 'adresse_unmerged';
    var merged = 'adresse_merged';
    yield mergeValidTime(client, 'dar_adresse', adresseHistoryTable, ['id'], ['id', 'bkid', 'statuskode', 'husnummerid', 'etagebetegnelse', 'doerbetegnelse'], true);
    var query =
      `SELECT a.bkid as id, a.id as dar_id, aa.id as adgangspunktid,
ap_statuskode, hn_statuskode, a.statuskode, kommunekode, vejkode, vejnavn, adresseringsvejnavn, husnr,
a.etagebetegnelse as etage, a.doerbetegnelse as doer,
supplerendebynavn, postnr, postnrnavn,
a.virkning * aa.virkning as virkning
FROM ${adresseHistoryTable} a JOIN vask_adgangsadresser aa ON a.husnummerid = hn_id AND aa.virkning && a.virkning
`;
    yield client.queryp(`CREATE TEMP TABLE ${unmerged} AS (${query})`);
    yield client.queryp(`DROP TABLE ${adresseHistoryTable}`);
    yield mergeValidTime(client, unmerged, merged, ['id'], ['id', 'dar_id', 'adgangspunktid', 'ap_statuskode', 'hn_statuskode', 'statuskode', 'kommunekode', 'vejkode', 'vejnavn', 'adresseringsvejnavn', 'husnr', 'etage', 'doer', 'supplerendebynavn', 'postnr', 'postnrnavn'], false);
    yield client.queryp(`DROP TABLE ${unmerged}`);
    yield client.queryp(`DELETE FROM vask_adresser; INSERT INTO vask_adresser (SELECT * FROM ${merged})`);
    yield client.queryp(`DROP TABLE ${merged}`);
    yield client.queryp('DELETE FROM vask_adresser_unikke');
    yield client.queryp(`
INSERT INTO vask_adresser_unikke (id, vejnavn, husnr, etage, doer, postnr, postnrnavn)
  (SELECT DISTINCT
     id,
     vejnavn,
     husnr,
     etage,
     doer,
     postnr,
     postnrnavn
   FROM
     vask_adresser);

INSERT INTO vask_adresser_unikke (id, vejnavn, husnr, etage, doer, supplerendebynavn, postnr, postnrnavn)
  (SELECT DISTINCT
     id,
     vejnavn,
     husnr,
     etage,
     doer,
     supplerendebynavn,
     postnr,
     postnrnavn
   FROM
     vask_adresser
   WHERE supplerendebynavn IS NOT NULL);

INSERT INTO vask_adresser_unikke (id, vejnavn, husnr, etage, doer, postnr, postnrnavn)
  (SELECT DISTINCT
     id,
     adresseringsvejnavn,
     husnr,
     etage,
     doer,
     postnr,
     postnrnavn
   FROM
     vask_adresser
   WHERE adresseringsvejnavn <> vejnavn);

INSERT INTO vask_adresser_unikke (id, vejnavn, husnr, etage, doer, supplerendebynavn, postnr, postnrnavn)
  (SELECT DISTINCT
     id,
     adresseringsvejnavn,
     husnr,
     etage,
     doer,
     supplerendebynavn,
     postnr,
     postnrnavn
   FROM
     vask_adresser
   WHERE supplerendebynavn IS NOT NULL AND adresseringsvejnavn <> vejnavn);

INSERT INTO vask_adresser_unikke (id, vejnavn, husnr, etage, doer, supplerendebynavn, postnr, postnrnavn)
  (SELECT
     v.id,
     v.vejnavn,
     v.husnr,
     v.etage,
     v.doer,
     v.supplerendebynavn,
     s.nr   AS postnr,
     s.navn AS postnrnavn
   FROM vask_adresser_unikke v JOIN (SELECT DISTINCT va.id, va.adgangsadresseid FROM vask_adresser va) as va ON v.id = va.id JOIN stormodtagere s ON va.adgangsadresseid = s.adgangsadresseid);
`);
    yield client.queryp('SELECT vask_adresser_unikke_update_tsv()');
  })();
}

module.exports = {
  createHeadTailTempTable: createHeadTailTempTable,
  mergeValidTime: mergeValidTime,
  generateAdgangsadresserHistory: generateAdgangsadresserHistory,
  generateAdresserHistory: generateAdresserHistory
};
