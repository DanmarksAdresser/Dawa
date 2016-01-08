"use strict";

const stream = require('stream');
const util = require('util');
const q = require('q');
const _ = require('underscore');

const dbapi = require('../dbapi');
const extendStreetIntervals = require('./extendStreetIntervals');
const promisingStreamCombiner = require('../promisingStreamCombiner');
const sqlUtil = require('../darImport/sqlUtil');

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
    parameters,
    callback);
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
         tstzrange(utc_trunc_date(oprettimestamp), utc_trunc_date(ophoerttimestamp), '[)') AS virkning
       FROM dar_postnr WHERE upper(registrering) IS NULL AND side IS NOT NULL)) as p GROUP BY kommunekode, vejkode, side ORDER BY kommunekode, vejkode, side;
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

//function createVejnavnHistory(client, vejnavnHistoryTable) {
//  return q.async(function*() {
//    yield client.queryp(`CREATE TEMP TABLE ${vejnavnHistoryTable} AS (SELECT * FROM cpr_vej)`);
//    const upperValid = (yield client.queryp('SELECT max(upper(virkning)) as max FROM cpr_vej')).rows[0].max;
//    yield client.queryp(`INSERT INTO ${vejnavnHistoryTable} (SELECT kommunekode, vejkode, navn, adresseringsnavn,
//  tstzrange(greatest(oprettimestamp, $1), ophoerttimestamp, '[)') as virkning
//FROM dar_vejnavn WHERE upper(registrering) IS NULL and ophoerttimestamp > $1);
//`, [upperValid]);
//  })();
//}
//
//function createVejnavnPostnummerHistory(
//  client,
//  postnummerIntervalHistoryTable,
//  vejnavnHistoryTable,
//  vejnavnPostnummerHistoryTable) {
//  client.queryp(`WITH pns AS
//  (SELECT kommunekode, vejkode, postnr, tstzrange(min(lower(virkning), max(upper(virkning))
//  GROUP BY kommunekode, vejkode, postnr)
//  SELECT `)
//}

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
   hn.virkning * ap.virkning as virkning
  FROM ${husnummerHistoryTable} hn JOIN ${adgangspunktHistoryTable} ap
   ON hn.adgangspunktid = ap.id AND hn.virkning && ap.virkning`;
    yield client.queryp(`CREATE TEMP TABLE ${joinedTable} AS (${query})`);
    //yield client.queryp(`DROP TABLE ${adgangspunktHistoryTable}; DROP TABLE ${husnummerHistoryTable}`);
    yield mergeValidTime(client, joinedTable, mergedTable, ['id'], ['id', 'bkid', 'hn_statuskode', 'ap_statuskode', 'adgangspunktid', 'kommunekode', 'vejkode', 'husnr'], false);
    yield client.queryp(`DROP TABLE ${joinedTable}`);
  })();
}

function mergeVejnavn(client, srcTable, mergedTable) {
  var unmergedTable = mergedTable + '_unmerged';
  return q.async(function*() {
    const src1Columns = ['id', 'bkid', 'hn_statuskode', 'ap_statuskode', 'adgangspunktid', 'kommunekode', 'vejkode', 'husnr'];
    const src2Columns = ['navn as vejnavn', 'adresseringsnavn'];
    const query = `CREATE TEMP TABLE ${unmergedTable} AS(select ${sqlUtil.selectList(srcTable, src1Columns)}, ${src2Columns.join(',')},
     ${srcTable}.virkning * cpr_vej.registrering as virkning
    FROM ${srcTable} JOIN cpr_vej ON ${srcTable}.kommunekode = cpr_vej.kommunekode
    AND ${srcTable}.vejkode = cpr_vej.vejkode
    AND ${srcTable}.virkning && cpr_vej.registrering)`;
    yield client.queryp(query);
    yield mergeValidTime(client, unmergedTable, mergedTable, ['id'], src1Columns.concat(['vejnavn', 'adresseringsnavn']), false);
    yield client.queryp(`DROP TABLE ${unmergedTable}`);
  })();
}

function mergePostnr(client, srcTable, mergedTable) {
  var unmergedTable = mergedTable + '_unmerged';
  return q.async(function*() {
    const src1Columns = ['id', 'bkid', 'hn_statuskode', 'ap_statuskode', 'adgangspunktid', 'kommunekode', 'vejkode', 'husnr', 'vejnavn', 'adresseringsnavn'];
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
    yield mergeValidTime(client, unmergedTable, mergedTable, ['id'], src1Columns.concat(['postnr']), false);
    yield client.queryp(`DROP TABLE ${unmergedTable}; DROP TABLE vask_postnrinterval`);
  })();
}

function generateAdgangsadresserHistory(client) {
  return q.async(function*() {
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
    husnr,
    sb.bynavn             AS supplerendebynavn,
    m.postnr,
    p.navn                AS postnrnavn,
    m.virkning
  FROM ${mergedTableWithPostnr} m
    LEFT JOIN dar_supplerendebynavn_current sb
      ON m.kommunekode = sb.kommunekode
         AND m.vejkode = sb.vejkode
         AND sb.side = (CASE WHEN (m.husnr).tal % 2 = 0
      THEN 'L'
                        ELSE 'U' END)
         AND m.husnr <@ sb.husnrinterval
    LEFT JOIN postnumre p ON postnr = p.nr
`;
    yield client.queryp(`DELETE FROM vask_adgangsadresser; INSERT INTO vask_adgangsadresser (${query})`);
    yield client.queryp(`DROP TABLE ${mergedTableWithPostnr}`);
    yield client.queryp('SELECT vask_adgangsadresser_update_tsv()');
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
ap_statuskode, hn_statuskode, a.statuskode, kommunekode, vejkode, vejnavn, husnr,
a.etagebetegnelse as etage, a.doerbetegnelse as doer,
supplerendebynavn, postnr, postnrnavn,
a.virkning * aa.virkning as virkning
FROM ${adresseHistoryTable} a JOIN vask_adgangsadresser aa ON a.husnummerid = hn_id AND aa.virkning && a.virkning
`;
    yield client.queryp(`CREATE TEMP TABLE ${unmerged} AS (${query})`);
    yield client.queryp(`DROP TABLE ${adresseHistoryTable}`);
    yield mergeValidTime(client, unmerged, merged, ['id'], ['id', 'dar_id', 'adgangspunktid', 'ap_statuskode', 'hn_statuskode', 'statuskode', 'kommunekode', 'vejkode', 'vejnavn', 'husnr', 'etage', 'doer', 'supplerendebynavn', 'postnr', 'postnrnavn'], false);
    yield client.queryp(`DROP TABLE ${unmerged}`);
    yield client.queryp(`DELETE FROM vask_adresser; INSERT INTO vask_adresser (SELECT * FROM ${merged})`);
    yield client.queryp(`DROP TABLE ${merged}`);
    yield client.queryp('SELECT vask_adresser_update_tsv()');
  })();
}

module.exports = {
  createHeadTailTempTable: createHeadTailTempTable,
  mergeValidTime: mergeValidTime,
  generateAdgangsadresserHistory: generateAdgangsadresserHistory,
  generateAdresserHistory: generateAdresserHistory
};
