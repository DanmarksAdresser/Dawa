"use strict";

const {go} = require('ts-csp');

const sqlUtil = require('../darImport/sqlUtil');

const createHeadTailTempTable = (client, tableName, htsTableName, idColumns, columns, bitemporal) => {
  const selectIds = sqlUtil.selectList(tableName, idColumns.concat('virkning'));
  const selectHead = "(lag(virkning, 1) OVER w) IS NULL OR COALESCE(upper(lag(virkning, 1) OVER w) <> lower(virkning), TRUE) AS head";
  const selectTail = "(lead(virkning, 1) OVER w) IS NULL OR COALESCE(lower(lead(virkning, 1) OVER w) <> upper(virkning), TRUE) AS tail";
  const window = `WINDOW w AS (PARTITION BY ${columns.join(', ')} ORDER BY lower(virkning))`;
  const whereClause = bitemporal ? " WHERE upper(registrering) IS NULL" : "";
  const selectQuery = `SELECT ${selectIds}, ${selectHead}, ${selectTail} FROM ${tableName} ${whereClause} ${window}`;
  const sql = `CREATE TEMP TABLE ${htsTableName} AS (${selectQuery});` +
    ` CREATE INDEX ON ${htsTableName}(${idColumns.join(', ')})`;
  return client.queryp(sql);
};

const mergeValidTime = (client, tableName, targetTableName, idColumns, columns, bitemporal) => go(function*() {
  const htsTableName = tableName + "_hts";
  yield createHeadTailTempTable(client, tableName, htsTableName, idColumns, columns, bitemporal);
  const subselect =
    `SELECT upper(ht2.virkning)
     FROM ${htsTableName} ht2
     WHERE ${sqlUtil.columnsEqualClause('ht', 'ht2', idColumns)}
      AND ht2.tail AND lower(ht2.virkning) >= lower(ht.virkning) ORDER BY ${columns.join(', ')}, lower(virkning) LIMIT 1`
  const select = `SELECT ${sqlUtil.selectList('tab', columns)},
  tstzrange(lower(ht.virkning),
  (${subselect}), '[)') as virkning
  FROM ${htsTableName} ht
  JOIN ${tableName} tab ON ${sqlUtil.columnsEqualClause('ht', 'tab', idColumns)} AND ht.virkning = tab.virkning ${bitemporal ? ' AND upper(tab.registrering) IS NULL' : ''}
  WHERE ht.head`;
  const sql = `CREATE TEMP TABLE ${targetTableName} AS (${select})`;
  yield client.queryp(sql);
  yield client.queryp(`DROP TABLE ${htsTableName}`);
});

const prepareDar1Husnummer = client => mergeValidTime(client,
  'dar1_husnummer',
  'dar1_husnummer_prepared',
  ['id'],
  ['id', 'status', 'husnummertekst', 'adgangspunkt_id', 'darkommune_id',
    'navngivenvej_id', 'postnummer_id', 'supplerendebynavn_id']);

const prepareDar1Postnummer = client => mergeValidTime(client,
  'dar1_postnummer', 'dar1_postnummer_prepared',
  ['id'],
  ['id', 'postnr', 'navn']);

const prepareDar1SupplerendeBynavn = client =>
  mergeValidTime(client, 'dar1_supplerendebynavn', 'dar1_supplerendebynavn_prepared', ['id'], ['id', 'navn'], true)

const prepareDar1Adresse = client =>
  mergeValidTime(client, 'dar1_adresse', 'dar1_adresse_prepared', ['id'], ['id', 'status', 'husnummer_id', 'etagebetegnelse', 'dørbetegnelse'], true)

const prepareDar1Adressepunkt = client =>
  mergeValidTime(client, 'dar1_adressepunkt', 'dar1_adressepunkt_prepared', ['id'], ['id', 'status'], true);

const prepareDar1Kommune = client =>
  mergeValidTime(client, 'dar1_darkommuneinddeling', 'dar1_kommune_prepared', ['id'], ['id', 'kommunekode'], true);

const prepareDar1NavngivenVej = client =>
  mergeValidTime(client, 'dar1_navngivenvej', 'dar1_navngivenvej_prepared', ['id'], ['id', 'vejnavn', 'vejadresseringsnavn'], true);

const prepareDar1NavngivenVejKommunedel = client =>
  mergeValidTime(client, 'dar1_navngivenvejkommunedel', 'dar1_navngivenvejkommunedel_prepared', ['id'], ['id', 'navngivenvej_id', 'kommune', 'vejkode'], true);


const mergePostnr = client =>
  client.query(`CREATE TEMP TABLE postnummer_merged AS (SELECT hn.id, hn.status as hn_status, husnummertekst as husnr, adgangspunkt_id, darkommune_id,
    navngivenvej_id, postnummer_id, supplerendebynavn_id, p.postnr,
    hn.virkning * p.virkning as virkning
    FROM dar1_husnummer_prepared hn JOIN dar1_postnummer_prepared p ON hn.postnummer_id = p.id AND hn.virkning && p.virkning)`);

const mergeSupplerendeBynavn = client =>
  client.query(`CREATE TEMP TABLE supplerendebynavn_merged AS (SELECT aa.id, hn_status, husnr, adgangspunkt_id, darkommune_id,
    navngivenvej_id, postnr, sb.navn as supplerendebynavn,
    COALESCE(aa.virkning * sb.virkning, aa.virkning) as virkning
    FROM postnummer_merged aa LEFT JOIN dar1_supplerendebynavn_prepared sb ON aa.supplerendebynavn_id = sb.id AND aa.virkning && sb.virkning)`);

const mergeKommune = client =>
  client.query(`CREATE TEMP TABLE kommune_merged AS (SELECT aa.id, hn_status, husnr, adgangspunkt_id,
    navngivenvej_id, postnr, supplerendebynavn, k.kommunekode,
    aa.virkning * k.virkning as virkning
    FROM supplerendebynavn_merged aa JOIN dar1_kommune_prepared k ON aa.darkommune_id = k.id AND aa.virkning && k.virkning)`);

const mergeVejkode = client =>
  client.query(`CREATE TEMP TABLE vejkode_merged AS (SELECT aa.id, hn_status, husnr, adgangspunkt_id,
    aa.navngivenvej_id, postnr, supplerendebynavn, kommunekode, nvk.vejkode,
    aa.virkning * nvk.virkning as virkning
    FROM kommune_merged aa JOIN dar1_navngivenvejkommunedel_prepared nvk
     ON aa.navngivenvej_id = nvk.navngivenvej_id
      AND aa.kommunekode = nvk.kommune
      AND aa.virkning && nvk.virkning)`);

const mergeVejnavn = client =>
  client.query(`CREATE TEMP TABLE vejnavn_merged AS (SELECT aa.id, hn_status, husnr, adgangspunkt_id,
     postnr, supplerendebynavn, kommunekode, vejkode, vejnavn, vejadresseringsnavn as adresseringsvejnavn,
     aa.virkning * nv.virkning as virkning
    FROM vejkode_merged aa JOIN dar1_navngivenvej_prepared nv
     ON aa.navngivenvej_id = nv.id
      AND aa.virkning && nv.virkning)`);

const generateAdgangsadresser = client => go(function*() {
  const select = `SELECT aa.id, hn_status, ap.status as ap_status, husnr,
     postnr, supplerendebynavn, kommunekode, vejkode, vejnavn, adresseringsvejnavn,
     aa.virkning * ap.virkning as virkning
    FROM vejnavn_merged aa LEFT JOIN dar1_adressepunkt_prepared ap
     ON aa.adgangspunkt_id = ap.id
      AND aa.virkning && ap.virkning`;
  const query = `DELETE FROM vask_adgangsadresser; INSERT INTO vask_adgangsadresser
  (id, hn_statuskode, ap_statuskode, husnr, postnr, supplerendebynavn, kommunekode, vejkode, vejnavn, adresseringsvejnavn, virkning) 
  (${select})`;
  yield client.query(query);
});

const generateAdresser = client => go(function*() {
  const select = `SELECT a.id, aa.id as adgangsadresseid, hn_statuskode, ap_statuskode, husnr, postnr, supplerendebynavn,
   kommunekode, vejkode, vejnavn, adresseringsvejnavn,
   etagebetegnelse, dørbetegnelse,
   aa.virkning * a.virkning as virkning
    FROM vask_adgangsadresser aa JOIN dar1_adresse_prepared a ON aa.id = a.husnummer_id
   AND aa.virkning && a.virkning`;
  const query = `delete from vask_adresser; INSERT INTO vask_adresser 
  (id, adgangsadresseid, hn_statuskode, ap_statuskode, husnr, postnr, supplerendebynavn, kommunekode, vejkode, vejnavn, adresseringsvejnavn, 
  etage, doer, virkning)
  (${select})`;
  yield client.query(query);
});

const generateHistoryImpl = client => go(function*() {
  yield prepareDar1Husnummer(client);
  yield prepareDar1Postnummer(client);
  yield mergePostnr(client);
  yield client.query('drop table dar1_postnummer_prepared');
  yield prepareDar1SupplerendeBynavn(client);
  yield mergeSupplerendeBynavn(client);
  yield client.query('drop table dar1_supplerendebynavn_prepared');
  yield client.query('drop table postnummer_merged');
  yield prepareDar1Kommune(client);
  yield mergeKommune(client);
  yield client.query('drop table dar1_kommune_prepared');
  yield client.query('drop table supplerendebynavn_merged');
  yield prepareDar1NavngivenVejKommunedel(client);
  yield mergeVejkode(client);
  yield client.query('drop table dar1_navngivenvejkommunedel_prepared');
  yield client.query('drop table kommune_merged');
  yield prepareDar1NavngivenVej(client);
  yield mergeVejnavn(client);
  yield client.query('drop table dar1_navngivenvej_prepared');
  yield client.query('drop table vejkode_merged');
  yield prepareDar1Adressepunkt(client);
  yield generateAdgangsadresser(client);
  yield client.query('drop table dar1_adressepunkt_prepared');
  yield client.query('drop table vejnavn_merged');
  yield prepareDar1Adresse(client);
  yield generateAdresser(client);
});
module.exports = {
  generateHistoryImpl
};
