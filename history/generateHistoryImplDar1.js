"use strict";

const {go} = require('ts-csp');
const {Transform} = require('stream');
const moment = require('moment');
require('moment-timezone');

const tableModels = require('../psql/tableModel');

const {createTempHistoryTable, mergeValidTime, TableInserter,
processAdgangsadresserHistory, processAdresserHistory, createVejstykkerPostnumreHistory} = require('./common');
const Range = require('../psql/databaseTypes').Range;
const intervalMath = require('../intervalMath');
const dbapi = require('../dbapi');
const promisingStreamCombiner = require('../promisingStreamCombiner');

function inclusive(i) {
  return (i.minInclusive ? '[' : '(') + (i.maxInclusive ? ']' : ')');
}

const ensurePostnrNotOverlapping = obj => {
  const intervals = obj.intervals;
  const mappedIntervals = intervals.map(interval => {
    const min = interval.virkningstart ? moment(interval.virkningstart).valueOf() : Number.NEGATIVE_INFINITY;
    const max = interval.virkningslut ? moment(interval.virkningslut).valueOf() : Number.POSITIVE_INFINITY;
    return {
      min: min,
      max: max,
      minInclusive: min !== Number.NEGATIVE_INFINITY,
      maxInclusive: false,
      ref: {postnr: interval.postnr, priority: interval.priority}
    }
  });
  const notOverlappingIntervals = intervalMath.ensureNotOverlapping(mappedIntervals, intervalMath.valueMath.numberComparator);
  // const extendedIntervals = intervalMath.extend(notOverlappingIntervals, intervalMath.valueMath.numberComparator);
  const result = notOverlappingIntervals.map((interval) => {
    const virkningstart = interval.min === Number.NEGATIVE_INFINITY ? null : moment.tz(interval.min, 'utc').format('YYYY-MM-DDTHH:mm:ss.SSSZ');
    const virkningslut = interval.max === Number.POSITIVE_INFINITY ? null : moment.tz(interval.max, 'utc').format('YYYY-MM-DDTHH:mm:ss.SSSZ');
    const virkningInclusive = inclusive(interval);
    const result = { postnr: interval.ref.postnr};
    result.virkning = new Range(virkningstart, virkningslut, virkningInclusive);
    result.adresseid = obj.adresseid;
    return result;
  });

  return result;
};

class PostnrTransformer extends Transform {
  constructor() {
    super({objectMode: true});
  }

  _transform(obj, enc, cb) {
    const result = ensurePostnrNotOverlapping(obj);
    for (let interval of result) {
      this.push(interval);
    }
    cb();
  }
}

const createCombinedPostnrHistory = client => go(function*() {
  const intervalSql = `SELECT adresseid,
  json_agg(json_build_object('postnr', postnr,
                             'virkningstart', lower(virkning),
                             'virkningslut', upper(virkning))) as intervals
                             FROM (select adresseid, postnr, virkning from postnr_history order by priority) t
                             GROUP BY adresseid
`;
  const intervalStream = yield dbapi.streamRaw(client, intervalSql, []);
  const columns = ['adresseid', 'postnr', 'virkning'];
  yield client.query('CREATE TEMP TABLE combined_postnr_history_unmerged as  (select adresseid, postnr, virkning from postnr_history where false)');
  yield promisingStreamCombiner([
    intervalStream,
    new PostnrTransformer(),
    new TableInserter(client, 'combined_postnr_history_unmerged', columns)
  ]);
  yield mergeValidTime(client, 'combined_postnr_history_unmerged', 'combined_postnr_history_merged', ['adresseid'], ['adresseid', 'postnr'], false);

});


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
  mergeValidTime(client, 'dar1_supplerendebynavn_history', 'dar1_supplerendebynavn_prepared', ['id'], ['id', 'navn'], true)

const prepareDar1Adresse = client =>
  mergeValidTime(client, 'dar1_adresse_history', 'dar1_adresse_prepared', ['id'], ['id', 'status', 'husnummer_id', 'etagebetegnelse', 'dørbetegnelse'], true)

const prepareDar1Adressepunkt = client =>
  mergeValidTime(client, 'dar1_adressepunkt_history', 'dar1_adressepunkt_prepared', ['id'], ['id', 'status'], true);

const prepareDar1Kommune = client =>
  mergeValidTime(client, 'dar1_darkommuneinddeling_history', 'dar1_kommune_prepared', ['id'], ['id', 'kommunekode'], true);

const prepareDar1NavngivenVej = client =>
  mergeValidTime(client, 'dar1_navngivenvej_history', 'dar1_navngivenvej_prepared', ['id'], ['id', 'vejnavn', 'vejadresseringsnavn'], true);

const prepareDar1NavngivenVejKommunedel = client =>
  mergeValidTime(client, 'dar1_navngivenvejkommunedel_history', 'dar1_navngivenvejkommunedel_prepared', ['id'], ['id', 'navngivenvej_id', 'kommune', 'vejkode'], true);

const mergePostnr = client =>
  client.query(`CREATE TEMP TABLE postnummer_merged AS (SELECT hn.id, hn.status as hn_status, husnummertekst as husnr, adgangspunkt_id, darkommune_id,
    navngivenvej_id, supplerendebynavn_id, p.postnr, p2.navn as postnrnavn,
    hn.virkning * p.virkning as virkning
    FROM dar1_husnummer_prepared hn 
    JOIN combined_postnr_history_merged p 
      ON hn.id = p.adresseid AND hn.virkning && p.virkning
    JOIN postnumre p2 ON p.postnr = p2.nr)`);

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
     postnr, postnrnavn, supplerendebynavn, aa.kommunekode, aa.vejkode, vejnavn, adresseringsvejnavn,
     aa.virkning * vn.virkning as virkning
    FROM vejkode_merged aa JOIN vejnavn_history_merged vn
     ON aa.kommunekode = vn.kommunekode and aa.vejkode = vn.vejkode
      AND aa.virkning && vn.virkning)`);

const generateAdgangsadresser = client => go(function*() {
  const select = `SELECT aa.id, dar1_status_til_dawa_status(hn_status) as hn_status, dar1_status_til_dawa_status(ap.status) as ap_status, husnr,
     postnr, postnrnavn, supplerendebynavn, kommunekode, vejkode, vejnavn, adresseringsvejnavn,
     aa.virkning * ap.virkning as virkning
    FROM vejnavn_merged aa LEFT JOIN dar1_adressepunkt_prepared ap
     ON aa.adgangspunkt_id = ap.id
      AND aa.virkning && ap.virkning`;
  const query = `DELETE FROM vask_adgangsadresser; INSERT INTO vask_adgangsadresser
  (id, hn_statuskode, ap_statuskode, husnr, postnr, postnrnavn, supplerendebynavn, kommunekode, vejkode, vejnavn, adresseringsvejnavn, virkning) 
  (${select})`;
  yield client.query(query);
});

const generateAdresser = client => go(function*() {
  const select = `SELECT a.id, dar1_status_til_dawa_status(a.status) as statuskode, aa.id as adgangsadresseid, hn_statuskode, ap_statuskode, husnr, postnr, postnrnavn, supplerendebynavn,
   kommunekode, vejkode, vejnavn, adresseringsvejnavn,
   etagebetegnelse, dørbetegnelse,
   aa.virkning * a.virkning as virkning
    FROM vask_adgangsadresser aa JOIN dar1_adresse_prepared a ON aa.id = a.husnummer_id
   AND aa.virkning && a.virkning`;
  const query = `delete from vask_adresser; INSERT INTO vask_adresser 
  (id, statuskode, adgangsadresseid, hn_statuskode, ap_statuskode, husnr, postnr, postnrnavn, supplerendebynavn, kommunekode, vejkode, vejnavn, adresseringsvejnavn, 
  etage, doer, virkning)
  (${select})`;
  yield client.query(query);
});

const preparePostnummerHistory = (client, dar1CutoffDate) => go(function*() {
  yield client.query(`CREATE TEMP TABLE postnr_history (
  adresseid uuid not null, 
  postnr smallint not null, 
  virkning tstzrange not null, 
  priority smallint not null)`);
  yield createTempHistoryTable(client, tableModels.tables.adgangsadresser);
  // DAWA data has highest priority, but only before dar1 cutoff date
  yield client.query(`INSERT INTO postnr_history(adresseid, postnr, virkning, priority)
   (SELECT id, postnr, tstzrange(t_from.time, least(t_to.time, $1), '[)'), 1
    FROM adgangsadresser_history h
    LEFT JOIN transaction_history t_from ON h.valid_from = t_from.sequence_number
    LEFT JOIN transaction_history t_to ON h.valid_to = t_to.sequence_number
    WHERE  postnr IS NOT NULL and (t_from.time IS NULL OR  t_from.time < $1))`, [dar1CutoffDate]);

  // DAR has secondary priority
  yield client.query(`INSERT INTO postnr_history (adresseid, postnr, virkning, priority)
    (SELECT hn.id, p.postnr, hn.virkning * p.virkning, 2
     FROM dar1_husnummer_history hn 
     JOIN dar1_postnummer_history p
     ON hn.postnummer_id = p.id AND hn.virkning && p.virkning)`);
  yield createCombinedPostnrHistory(client);
});

const prepareVejnavnHistory = (client, dar1CutoffDate) => go(function*() {
  yield client.query(`CREATE TEMP TABLE vejnavn_history_unmerged AS (SELECT kommunekode, vejkode, 
  navn as vejnavn, adresseringsnavn as adresseringsvejnavn, tstzrange(lower(virkning), least($1, upper(virkning)), '[)') as virkning FROM cpr_vej
  WHERE lower(virkning) < least($1, upper(virkning)))`, [dar1CutoffDate]);
  yield client.query(`CREATE TEMP TABLE dar_vejnavn_joined AS 
  (SELECT kommune as kommunekode, vejkode, 
  vejnavn, vejadresseringsnavn as adresseringsvejnavn, nv.virkning * nvk.virkning virkning 
  FROM dar1_navngivenvej_prepared nv 
  JOIN dar1_navngivenvejkommunedel_prepared nvk ON nv.id = nvk.navngivenvej_id and nv.virkning && nvk.virkning)`);
  yield client.query(`INSERT INTO vejnavn_history_unmerged(kommunekode, vejkode, vejnavn, adresseringsvejnavn, virkning)
   (SELECT kommunekode, vejkode, 
  vejnavn, adresseringsvejnavn, tstzrange(greatest(lower(virkning), $1), upper(virkning), '[)') as virkning FROM 
  dar_vejnavn_joined
  WHERE greatest(lower(virkning), $1) < upper(virkning))`, [dar1CutoffDate]);
  yield mergeValidTime(
    client,
    'vejnavn_history_unmerged',
    'vejnavn_history_merged',
    ['kommunekode', 'vejkode'],
    ['kommunekode', 'vejkode', 'vejnavn', 'adresseringsvejnavn'],
    false);
});

const generateHistoryImpl = (client, dar1CutoffDate) => go(function*() {
  yield prepareDar1Husnummer(client);
  yield prepareDar1Postnummer(client);
  yield preparePostnummerHistory(client, dar1CutoffDate);
  yield mergePostnr(client);
  yield client.query('DROP TABLE postnr_history');
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
  yield prepareDar1NavngivenVej(client);
  yield prepareVejnavnHistory(client, dar1CutoffDate);
  yield client.query('drop table dar1_navngivenvejkommunedel_prepared');
  yield client.query('drop table kommune_merged');
  yield mergeVejnavn(client);
  yield client.query('drop table dar1_navngivenvej_prepared');
  yield client.query('drop table vejkode_merged');
  yield prepareDar1Adressepunkt(client);
  yield generateAdgangsadresser(client);
  yield client.query('drop table dar1_adressepunkt_prepared');
  yield client.query('drop table vejnavn_merged');
  yield prepareDar1Adresse(client);
  yield generateAdresser(client);
  yield processAdgangsadresserHistory(client);
  yield processAdresserHistory(client);
  yield createVejstykkerPostnumreHistory(client);
});
module.exports = {
  generateHistoryImpl,
  internal: {
    prepareDar1Postnummer,
    preparePostnummerHistory,
    mergePostnr,
    prepareDar1Husnummer
  }
};
