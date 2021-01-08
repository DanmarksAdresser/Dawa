"use strict";

const { Writable } = require('stream');
const util = require('util');
const _ = require('underscore');
const { go } = require('ts-csp');

const {mergeValidTime, createHeadTailTempTable } = require('@dawadk/import-util/src/history-util');

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
  const valueRows = rows.map((row) => {
    const values = [];
    this.columns.forEach(col => {
      const value = row[col];
      parameters.push(value);
      values.push('$' + parameters.length);
    });
    return '(' + values.join(',') + ')';
  });
  this.client.query(
    `INSERT INTO ${this.table} (${this.columns.join(',')}) VALUES ${valueRows.join(',')}`,
    parameters).asPromise().nodeify(callback);
};

const cutoffAfter = (client, table, cutoffDate) => go(function*() {
  yield client.query(`delete from ${table} where lower(virkning) >= $1::timestamptz`, [cutoffDate]);
  yield client.query(`update ${table} SET virkning = tstzrange(lower(virkning), least(upper(virkning), $1::timestamptz), '[)')`, [cutoffDate]);
});

const cutoffBefore = (client, table, cutoffDate) => go(function*(){
  yield client.query(` delete from ${table} where upper(virkning) <= $1::timestamptz`, [cutoffDate]);
  yield client.query(`update ${table} SET virkning = tstzrange(greatest(lower(virkning), $1::timestamptz), upper(virkning), '[)')`, [cutoffDate]);
});

const processAdgangsadresserHistory = client => go(function*() {
  yield client.queryp('DELETE FROM vask_adgangsadresser_unikke');
  yield client.queryp(`
  WITH uniques AS (
  (SELECT
     id,
     vejnavn,
     husnr,
     null::text as supplerendebynavn,
     postnr,
     postnrnavn
   FROM
     vask_adgangsadresser)

  UNION
  (SELECT
     id,
     vejnavn,
     husnr,
     supplerendebynavn,
     postnr,
     postnrnavn
   FROM
     vask_adgangsadresser
   WHERE supplerendebynavn IS NOT NULL)

  UNION
  (SELECT
     id,
     adresseringsvejnavn,
     husnr,
     null::text as supplerendebynavn,
     postnr,
     postnrnavn
   FROM
     vask_adgangsadresser
   WHERE adresseringsvejnavn <> vejnavn)

  UNION 
  (SELECT
     id,
     adresseringsvejnavn,
     husnr,
     supplerendebynavn,
     postnr,
     postnrnavn
   FROM
     vask_adgangsadresser
   WHERE supplerendebynavn IS NOT NULL AND adresseringsvejnavn <> vejnavn))
INSERT INTO vask_adgangsadresser_unikke (id, vejnavn, husnr, supplerendebynavn, postnr, postnrnavn)
  ((SELECT id,vejnavn,husnr,supplerendebynavn,postnr,postnrnavn from uniques)
  UNION
  (SELECT
     v.id,
     v.vejnavn,
     v.husnr,
     v.supplerendebynavn,
     s.nr   AS postnr,
     s.navn AS postnrnavn
   FROM uniques v JOIN stormodtagere s ON v.id = s.adgangsadresseid));
`);
  yield client.queryp('SELECT vask_adgangsadresser_unikke_update_tsv()');
});


function createVejstykkerPostnumreHistory(client) {
  return client.query(`
DELETE FROM vask_vejstykker_postnumre; 
insert into vask_vejstykker_postnumre(kommunekode,vejkode,vejnavn,postnr,tekst)
(select kommunekode,vejkode,vejnavn,postnr, vejnavn|| ' ' || postnr || ' ' || postnrnavn as tekst
from vask_adgangsadresser group by kommunekode,vejkode,vejnavn,postnr, vejnavn|| ' ' || postnr || ' ' || postnrnavn)
UNION
(select kommunekode,vejkode,adresseringsvejnavn,postnr, adresseringsvejnavn|| ' ' || postnr || ' ' || postnrnavn as tekst
from vask_adgangsadresser group by kommunekode,vejkode,adresseringsvejnavn,postnr, adresseringsvejnavn|| ' ' || postnr || ' ' || postnrnavn)
UNION (select kommunekode, vejkode, vejnavn, s.nr as postnr, vejnavn|| ' ' || formatPostnr(s.nr) || ' ' || s.navn as tekst
FROM stormodtagere s JOIN adgangsadresser_mat a ON s.adgangsadresseid = a.id)
;   
`);
}

const processAdresserHistory = client => go(function*() {
  yield client.queryp('DELETE FROM vask_adresser_unikke');
  yield client.queryp(`
WITH uniques AS (
  (SELECT
     id,
     vejnavn,
     husnr,
     etage,
     doer,
     null::text as supplerendebynavn,
     postnr,
     postnrnavn
   FROM
     vask_adresser)

  UNION
  (SELECT
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
   WHERE supplerendebynavn IS NOT NULL)

  UNION
  (SELECT
     id,
     adresseringsvejnavn,
     husnr,
     etage,
     doer,
     null::text as supplerendebynavn,
     postnr,
     postnrnavn
   FROM
     vask_adresser
   WHERE adresseringsvejnavn <> vejnavn)
  UNION
  (SELECT
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
   WHERE supplerendebynavn IS NOT NULL AND adresseringsvejnavn <> vejnavn))

INSERT INTO vask_adresser_unikke (id, vejnavn, husnr, etage, doer, supplerendebynavn, postnr, postnrnavn)
  ((select id, vejnavn, husnr, etage, doer, supplerendebynavn, postnr, postnrnavn from uniques)
  UNION
  (SELECT
     v.id,
     v.vejnavn,
     v.husnr,
     v.etage,
     v.doer,
     v.supplerendebynavn,
     s.nr   AS postnr,
     s.navn AS postnrnavn
   FROM uniques v JOIN (SELECT DISTINCT va.id, va.adgangsadresseid FROM vask_adresser va) as va ON v.id = va.id JOIN stormodtagere s ON va.adgangsadresseid = s.adgangsadresseid));
`);
  yield client.queryp('SELECT vask_adresser_unikke_update_tsv()');

});

const adgAdrCols = ['id', 'hn_statuskode', 'ap_statuskode', 'husnr', 'postnr', 'postnrnavn', 'supplerendebynavn', 'kommunekode', 'vejkode', 'vejnavn', 'adresseringsvejnavn'];
const adrCols = [...adgAdrCols, 'adgangsadresseid', 'statuskode', 'etage', 'doer'];

module.exports = {
  createHeadTailTempTable,
  TableInserter,
  mergeValidTime,
  processAdgangsadresserHistory,
  processAdresserHistory,
  createVejstykkerPostnumreHistory,
  cutoffAfter,
  cutoffBefore,
  adgAdrCols,
  adrCols
};

