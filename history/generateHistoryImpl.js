"use strict";

var q = require('q');
var sqlUtil = require('../darImport/sqlUtil');

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

function mergeAdgangspunktHusnummer(client, mergedTable) {
  return q.async(function*() {
    var adgangspunktHistoryTable = 'adgangspunkt_history';
    var husnummerHistoryTable = 'husnummer_history';
    var joinedTable = 'joined_adgangsadresser_history';
    yield mergeValidTime(client, 'dar_adgangspunkt', adgangspunktHistoryTable, ['id'], ['id', 'bkid', 'statuskode', 'kommunenummer'], true);
    yield mergeValidTime(client, 'dar_husnummer', husnummerHistoryTable, ['id'], ['id', 'bkid', 'statuskode', 'adgangspunktid', 'vejkode', 'husnummer'], true);
    var query =
      `SELECT hn.id, hn.bkid, hn.statuskode as hn_statuskode,
   ap.statuskode as ap_statuskode, hn.adgangspunktid, ap.kommunenummer as kommunekode,
   hn.vejkode, hn.husnummer as husnr,
   hn.virkning * ap.virkning as virkning
  FROM ${husnummerHistoryTable} hn JOIN ${adgangspunktHistoryTable} ap
   ON hn.adgangspunktid = ap.id AND hn.virkning && ap.virkning`;
    yield client.queryp(`CREATE TEMP TABLE ${joinedTable} AS (${query})`);
    yield client.queryp(`DROP TABLE ${adgangspunktHistoryTable}; DROP TABLE ${husnummerHistoryTable}`);
    yield mergeValidTime(client, joinedTable, mergedTable, ['id'], ['id', 'bkid', 'hn_statuskode', 'ap_statuskode', 'adgangspunktid', 'kommunekode', 'vejkode', 'husnr'], false);
    yield client.queryp(`DROP TABLE ${joinedTable}`);
  })();
}

function generateAdgangsadresserHistory(client) {
  return q.async(function*() {
    var mergedTable = 'merged_adgangsadresser_history';
    yield mergeAdgangspunktHusnummer(client, mergedTable);
    var query = `SELECT
    m.bkid               AS id,
    m.id AS hn_id,
    ap_statuskode,
    hn_statuskode,
    m.kommunekode,
    m.vejkode,
    vn.navn as vejnavn,
    husnr,
    sb.bynavn             AS supplerendebynavn,
    pn.postdistriktnummer AS postnr,
    p.navn                AS postnrnavn,
    m.virkning
  FROM ${mergedTable} m
    JOIN dar_vejnavn_current vn ON m.kommunekode = vn.kommunekode AND m.vejkode = vn.vejkode
    JOIN dar_postnr_current pn
      ON m.kommunekode = pn.kommunekode
         AND m.vejkode = pn.vejkode
         AND pn.side = (CASE WHEN (m.husnr).tal % 2 = 0
      THEN 'L'
                        ELSE 'U' END)
         AND m.husnr <@ pn.husnrinterval
    LEFT JOIN dar_supplerendebynavn_current sb
      ON m.kommunekode = sb.kommunekode
         AND m.vejkode = sb.vejkode
         AND sb.side = (CASE WHEN (m.husnr).tal % 2 = 0
      THEN 'L'
                        ELSE 'U' END)
         AND m.husnr <@ sb.husnrinterval
    JOIN postnumre p ON pn.postdistriktnummer = p.nr
`;
    yield client.queryp(`DELETE FROM vask_adgangsadresser; INSERT INTO vask_adgangsadresser (${query})`);
  })();
};

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
  })();
}

module.exports = {
  createHeadTailTempTable: createHeadTailTempTable,
  mergeValidTime: mergeValidTime,
  generateAdgangsadresserHistory: generateAdgangsadresserHistory,
  generateAdresserHistory: generateAdresserHistory
};
