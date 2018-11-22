"use strict";

const { go } = require('ts-csp');
const { Transform } = require('stream');
const util = require('util');
const q = require('q');
const _ = require('underscore');

const dbapi = require('../dbapi');
const extendStreetIntervals = require('./extendStreetIntervals');
const extendVejnavnIntervals = require('./extendVejnavnIntervals');
const promisingStreamCombiner = require('@dawadk/import-util/src/promising-stream-combiner');
const sqlUtil = require('@dawadk/common/src/postgres/sql-util')

const { TableInserter,
  mergeValidTime,
  cutoffAfter, adrCols } = require('./common');

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
  return client.query(`
  CREATE TEMP TABLE timedPostnrChanges AS
  (SELECT
    operation,
     nr,
     navn,
     coalesce((SELECT time
               FROM transaction_history h
               WHERE h.sequence_number = c.changeid),(select ts from transactions t where t.txid = c.txid and txid <> 1)) as ts
    FROM postnumre_changes c);
create index on timedPostnrChanges(nr);
delete from timedPostnrChanges where ts is null;
delete from vask_postnumre;
insert into vask_postnumre(nr,navn,virkning)
  (select c1.nr, c1.navn,
    tstzrange(ts, (select ts from timedPostnrChanges c2 where c1.nr = c2.nr and c1.ts < c2.ts order by ts asc limit 1), '[)')
  FROM timedPostnrChanges c1
  WHERE operation <> 'delete');
DROP TABLE timedPostnrChanges;
UPDATE vask_postnumre p1 SET virkning = tstzrange(null, upper(virkning), '[)')
WHERE not exists(select * from vask_postnumre p2 where p1.nr = p2.nr and upper(p2.virkning) <= lower(p1.virkning));`);
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
    const query = `CREATE TEMP TABLE ${unmergedTable} AS(
    SELECT ${sqlUtil.selectList(srcTable, src1Columns)},
    pi.nr as postnr,
    ${srcTable}.virkning * pi.virkning as virkning
    FROM ${srcTable}
    JOIN vask_postnrinterval pi
    ON ${srcTable}.vejkode = pi.vejkode
    AND ${srcTable}.kommunekode = pi.kommunekode
    AND husnr <@ pi.husnrinterval
    AND ${srcTable}.virkning && pi.virkning
    AND pi.side = (CASE WHEN (${srcTable}.husnr).tal % 2 = 0 THEN 'L'
                     ELSE 'U' END)
    )`;
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

function generateAdgangsadresserHistory(client, adgangsadresseDestTable, dar10CutoffDate) {
  return q.async(function*() {
    yield createPostnumreHistory(client);
    yield createVejnavnHistory(client);
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
    yield client.query(`create temp table suppl_merged as (${query})`);
    yield cutoffAfter(client, 'suppl_merged', dar10CutoffDate);
    yield client.query(`insert into ${adgangsadresseDestTable} (select * from suppl_merged)`);
  })();
}

function generateAdresserHistory(client, dar10CutoffDate, adgangsadresseTable, adresseDestTable) {
  return q.async(function*() {
    var adresseHistoryTable = 'adresse_history';
    var unmerged = 'adresse_unmerged';
    var merged = 'adresse_merged';
    yield mergeValidTime(client, 'dar_adresse', adresseHistoryTable, ['id'], ['id', 'bkid', 'statuskode', 'husnummerid', 'etagebetegnelse', 'doerbetegnelse'], true);
    var query =
      `SELECT a.bkid as id, a.id as dar_id, aa.id as adgangsadresseid,
ap_statuskode, hn_statuskode, a.statuskode, kommunekode, vejkode, vejnavn, adresseringsvejnavn, husnr,
a.etagebetegnelse as etage, a.doerbetegnelse as doer,
supplerendebynavn, postnr, postnrnavn,
a.virkning * aa.virkning as virkning
FROM ${adresseHistoryTable} a JOIN ${adgangsadresseTable} aa ON a.husnummerid = hn_id AND aa.virkning && a.virkning
`;
    yield client.queryp(`CREATE TEMP TABLE ${unmerged} AS (${query})`);
    yield client.queryp(`DROP TABLE ${adresseHistoryTable}`);
    yield mergeValidTime(client, unmerged, merged, ['id'], adrCols, false);
    yield client.queryp(`DROP TABLE ${unmerged}`);
    yield cutoffAfter(client, merged, dar10CutoffDate);
    yield client.queryp(`INSERT INTO ${adresseDestTable}(${adrCols}, virkning) (SELECT ${adrCols},virkning FROM ${merged})`);
    yield client.query(`drop table ${merged}`);
  })();
}

const generateHistory = (client, dar10CutoffDate, adgangsadresseDestTable, adresseDestTable) => go(function*(){
  yield generateAdgangsadresserHistory(client, adgangsadresseDestTable, dar10CutoffDate);
  yield generateAdresserHistory(client, dar10CutoffDate, adgangsadresseDestTable, adresseDestTable);
});

module.exports = {
  mergeValidTime,
  generateAdgangsadresserHistory,
  generateAdresserHistory,
  generateHistory
};
