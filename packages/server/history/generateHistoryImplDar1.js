"use strict";

const {go} = require('ts-csp');
require('moment-timezone');


const {mergeValidTime, cutoffBefore,
} = require('./common');


const prepareDar1Husnummer = client => mergeValidTime(client,
  'dar1_husnummer_history',
  'dar1_husnummer_prepared',
  ['id'],
  ['id', 'status', 'husnummertekst', 'adgangspunkt_id', 'darkommune_id',
    'navngivenvej_id', 'postnummer_id', 'supplerendebynavn_id']);

const prepareDar1Postnummer = client => mergeValidTime(client,
  'dar1_postnummer_history', 'dar1_postnummer_prepared',
  ['id'],
  ['id', 'postnr', 'navn']);

const prepareDar1SupplerendeBynavn = client =>
  mergeValidTime(client, 'dar1_supplerendebynavn_history', 'dar1_supplerendebynavn_prepared', ['id'], ['id', 'navn'])

const prepareDar1Adresse = client =>
  mergeValidTime(client, 'dar1_adresse_history', 'dar1_adresse_prepared', ['id'], ['id', 'status', 'husnummer_id', 'etagebetegnelse', 'dørbetegnelse']);

const prepareDar1Adressepunkt = client => go(function*() {
  yield mergeValidTime(client, 'dar1_adressepunkt_history', 'dar1_adressepunkt_prepared', ['id'], ['id', 'status']);
  // Vi modtager ikke adressepunkter med status "slettet", dem skal vi lige have tilføjet
  yield client.query(`
  WITH idsWithMissingHistory AS (SELECT DISTINCT id
                               FROM dar1_adressepunkt_prepared ap1
                               EXCEPT
                               (SELECT DISTINCT id
                                FROM dar1_adressepunkt_prepared
                                WHERE upper_inf(virkning))),
    virkningFroms AS
  (SELECT
     id,
     max(upper(virkning)) AS virkning
   FROM dar1_adressepunkt_prepared
     NATURAL JOIN idsWithMissingHistory
   GROUP BY id)
INSERT INTO dar1_adressepunkt_prepared (id, status, virkning)
  (SELECT
     id,
     10,
     tstzrange(virkning, NULL, '[)')
   FROM virkningFroms)`)
});

const prepareDar1Kommune = client =>
  mergeValidTime(client, 'dar1_darkommuneinddeling_history', 'dar1_kommune_prepared', ['id'], ['id', 'kommunekode']);

const prepareDar1NavngivenVej = client => go(function*() {
  yield mergeValidTime(client, 'dar1_navngivenvej_history', 'dar1_navngivenvej_prepared', ['id'], ['id', 'vejnavn', 'vejadresseringsnavn']);
  yield client.query('delete from dar1_navngivenvej_prepared where vejnavn is null');
});

const prepareDar1NavngivenVejKommunedel = client => go(function*() {
  yield mergeValidTime(client, 'dar1_navngivenvejkommunedel_history', 'dar1_navngivenvejkommunedel_prepared', ['id'], ['id', 'navngivenvej_id', 'kommune', 'vejkode']);
});

const mergePostnr = client =>
  client.query(`CREATE TEMP TABLE postnummer_merged AS (SELECT hn.id, hn.status as hn_status, husnummertekst as husnr, adgangspunkt_id, darkommune_id,
    navngivenvej_id, supplerendebynavn_id, p.postnr, p.navn as postnrnavn,
    hn.virkning * p.virkning as virkning
    FROM dar1_husnummer_prepared hn 
    JOIN dar1_postnummer_prepared p 
      ON hn.postnummer_id = p.id AND hn.virkning && p.virkning)`);

const mergeSupplerendeBynavn = client =>
  client.query(`CREATE TEMP TABLE supplerendebynavn_merged AS (SELECT aa.id, hn_status, husnr, adgangspunkt_id, darkommune_id,
    navngivenvej_id, postnr, postnrnavn, sb.navn as supplerendebynavn,
    COALESCE(aa.virkning * sb.virkning, aa.virkning) as virkning
    FROM postnummer_merged aa LEFT JOIN dar1_supplerendebynavn_prepared sb ON aa.supplerendebynavn_id = sb.id AND aa.virkning && sb.virkning)`);

const mergeKommune = client =>
  client.query(`CREATE TEMP TABLE kommune_merged AS (SELECT aa.id, hn_status, husnr, adgangspunkt_id,
    navngivenvej_id, postnr, postnrnavn, supplerendebynavn, k.kommunekode,
    aa.virkning * k.virkning as virkning
    FROM supplerendebynavn_merged aa JOIN dar1_kommune_prepared k ON aa.darkommune_id = k.id AND aa.virkning && k.virkning)`);

const mergeVejkode = client =>
  client.query(`CREATE TEMP TABLE vejkode_merged AS (SELECT aa.id, hn_status, husnr, adgangspunkt_id,
    aa.navngivenvej_id, postnr, postnrnavn, supplerendebynavn, kommunekode, nvk.vejkode,
    aa.virkning * nvk.virkning as virkning
    FROM kommune_merged aa JOIN dar1_navngivenvejkommunedel_prepared nvk
     ON aa.navngivenvej_id = nvk.navngivenvej_id
      AND aa.kommunekode = nvk.kommune
      AND aa.virkning && nvk.virkning)`);

const mergeVejnavn = client =>
  client.query(`CREATE TEMP TABLE vejnavn_merged AS (SELECT aa.id, hn_status, husnr, adgangspunkt_id,
     postnr, postnrnavn, supplerendebynavn, aa.kommunekode, aa.vejkode, vejnavn, vejadresseringsnavn as adresseringsvejnavn,
     aa.virkning * nv.virkning as virkning
    FROM vejkode_merged aa JOIN dar1_navngivenvej_prepared nv
     ON aa.navngivenvej_id = nv.id
      AND aa.virkning && nv.virkning)`);

const mergeAdgangspunkt = (client) => go(function*(){
  const select = `SELECT aa.id, dar1_status_til_dawa_status(hn_status) as hn_statuskode, dar1_ap_status_til_dawa_status(ap.status) as ap_statuskode, husnr,
     postnr, postnrnavn, supplerendebynavn, kommunekode, vejkode, vejnavn, adresseringsvejnavn,
     aa.virkning * ap.virkning as virkning
    FROM vejnavn_merged aa LEFT JOIN dar1_adressepunkt_prepared ap
     ON aa.adgangspunkt_id = ap.id
      AND aa.virkning && ap.virkning`;
  yield client.query(`CREATE TEMP TABLE adgangspunkt_unmerged AS (${select})`);
  yield mergeValidTime(client, 'adgangspunkt_unmerged', 'adgangspunkt_merged', ['id'], ['id', 'hn_statuskode', 'ap_statuskode', 'husnr', 'postnr', 'postnrnavn', 'supplerendebynavn','kommunekode', 'vejkode', 'vejnavn', 'adresseringsvejnavn']);
  yield client.query('drop table adgangspunkt_unmerged');
});

const removeIncomplete = client => go(function*() {
  yield client.query(`DELETE FROM adgangspunkt_merged WHERE vejnavn IS NULL OR husnr IS NULL or postnr IS NULL or postnrnavn IS NULL`);
});

const removeFuture = client => go(function*() {
  yield client.query(`DELETE FROM adgangspunkt_merged WHERE lower(virkning) > now()`);
});

const generateAdgangsadresser = (client, adgangsadresserDestTable, dar10CutoffDate) => go(function*() {
  yield removeIncomplete(client);
  yield removeFuture(client);
  yield cutoffBefore(client, 'adgangspunkt_merged', dar10CutoffDate);
  const query = `INSERT INTO ${adgangsadresserDestTable}
  (id, hn_statuskode, ap_statuskode, husnr, postnr, postnrnavn, supplerendebynavn, kommunekode, vejkode, vejnavn, adresseringsvejnavn, virkning) 
  (select id, hn_statuskode, ap_statuskode, husnr, postnr, postnrnavn, supplerendebynavn, kommunekode, vejkode, vejnavn, adresseringsvejnavn, virkning
  from adgangspunkt_merged)`;
  yield client.query(query);
});

const generateAdresser = (client, adgangsadresserTable, destTable, dar10CutoffDate) => go(function*() {
  const cols = ['id', 'statuskode', 'adgangsadresseid', 'hn_statuskode', 'ap_statuskode', 'husnr', 'postnr', 'postnrnavn', 'supplerendebynavn', 'kommunekode', 'vejkode', 'vejnavn', 'adresseringsvejnavn', 'etage', 'doer', 'virkning'];
  const select = `SELECT a.id, dar1_status_til_dawa_status(a.status) as statuskode, aa.id as adgangsadresseid, hn_statuskode, ap_statuskode, husnr, postnr, postnrnavn, supplerendebynavn,
   kommunekode, vejkode, vejnavn, adresseringsvejnavn,
   etagebetegnelse as etage, dørbetegnelse as doer,
   aa.virkning * a.virkning as virkning
    FROM ${adgangsadresserTable} aa JOIN dar1_adresse_prepared a ON aa.id = a.husnummer_id
   AND aa.virkning && a.virkning`;
  yield client.query(`create temp table adresser_unmerged AS (${select})`);
  yield cutoffBefore(client, 'adresser_unmerged', dar10CutoffDate);
  yield client.query(`INSERT INTO ${destTable}(${cols.join(',')})
  (select ${cols.join(',')} from adresser_unmerged)`);
});

const prepareVejnavnHistory = (client, dar1CutoffDate) => go(function*() {
  yield client.query(`CREATE TEMP TABLE dar_vejnavn_joined AS 
  (SELECT kommune as kommunekode, vejkode, 
  vejnavn, vejadresseringsnavn as adresseringsvejnavn, nv.virkning * nvk.virkning virkning 
  FROM dar1_navngivenvej_prepared nv 
  JOIN dar1_navngivenvejkommunedel_prepared nvk ON nv.id = nvk.navngivenvej_id and nv.virkning && nvk.virkning)`);
  yield client.query(`create temp table vejnavn_history_unmerged as
   (SELECT kommunekode, vejkode, 
  vejnavn, adresseringsvejnavn, tstzrange(greatest(lower(virkning), $1), upper(virkning), '[)') as virkning FROM 
  dar_vejnavn_joined
  WHERE upper_inf(virkning) or greatest(lower(virkning), $1) < upper(virkning))`, [dar1CutoffDate]);
  yield mergeValidTime(
    client,
    'dar_vejnavn_joined',
    'vejnavn_history_merged',
    ['kommunekode', 'vejkode'],
    ['kommunekode', 'vejkode', 'vejnavn', 'adresseringsvejnavn'],
    false);
  yield client.query('drop table vejnavn_history_unmerged');
});

const generateHistory = (client, dar1CutoffDate, adgangsadresserDestTable, adresserDestTable) => go(function*() {
  yield prepareDar1NavngivenVejKommunedel(client);
  yield prepareDar1Husnummer(client);
  yield prepareDar1Postnummer(client);
  yield mergePostnr(client);
  yield prepareDar1SupplerendeBynavn(client);
  yield mergeSupplerendeBynavn(client);
  yield client.query('drop table dar1_supplerendebynavn_prepared');
  yield client.query('drop table postnummer_merged');
  yield prepareDar1Kommune(client);
  yield mergeKommune(client);
  yield client.query('drop table dar1_kommune_prepared');
  yield client.query('drop table supplerendebynavn_merged');
  yield mergeVejkode(client);
  yield prepareDar1NavngivenVej(client);
  yield prepareVejnavnHistory(client, dar1CutoffDate);
  yield client.query('drop table dar1_navngivenvejkommunedel_prepared');
  yield client.query('drop table kommune_merged');
  yield mergeVejnavn(client);
  yield client.query('drop table dar1_navngivenvej_prepared');
  yield client.query('drop table vejkode_merged');
  yield prepareDar1Adressepunkt(client);
  yield mergeAdgangspunkt(client);
  yield generateAdgangsadresser(client, adgangsadresserDestTable, dar1CutoffDate);
  yield prepareDar1Adresse(client);
  yield generateAdresser(client,'adgangspunkt_merged', adresserDestTable, dar1CutoffDate);
  yield client.query('drop table adgangspunkt_merged');
});
module.exports = {
  generateHistory,
  internal: {
    prepareDar1Postnummer,
    mergePostnr,
    prepareDar1Husnummer,
    generateAdgangsadresser,
    generateAdresser
  }
};
