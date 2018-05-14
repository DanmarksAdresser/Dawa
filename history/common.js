"use strict";

const { Writable } = require('stream');
const util = require('util');
const _ = require('underscore');
const { go } = require('ts-csp');


const {allColumnNames, } = require('../importUtil/tableModelUtil');
const sqlUtil = require('../darImport/sqlUtil');
const tableSchema = require('../psql/tableModel');

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

const createTempHistoryTable = (client, tableModel) => {
  const partitionClause = sqlUtil.selectList(null, tableModel.primaryKey);
  const subselect = `select *, last_value(changeid) OVER (PARTITION BY ${partitionClause} ORDER BY changeid NULLS FIRST ROWS BETWEEN CURRENT ROW AND 1 FOLLOWING) as next_valid from ${tableModel.table}_changes`;
  const selectClause = sqlUtil.selectList(null, allColumnNames(tableModel));
  const select =
    `select changeid as valid_from, CASE WHEN next_valid = changeid THEN NULL ELSE next_valid END as valid_to, ${selectClause}
     FROM (${subselect}) t WHERE operation <> 'delete'`;
  return client.query(`CREATE TEMP TABLE ${tableModel.table}_history AS (${select})`);
};

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

const processAdgangsadresserHistory = client => go(function*() {
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
;   
`);
}

const processAdresserHistory = client => go(function*() {
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

});

const createPostnumreHistory = (client) => go(function*(){
    yield createTempHistoryTable(client, tableSchema.tables.postnumre);
    yield client.queryp('DELETE FROM vask_postnumre');
    yield client.queryp(`INSERT INTO vask_postnumre(nr, navn, virkning) (SELECT nr, navn, \
tstzrange((CASE WHEN tf.time < '2016-01-01' THEN NULL ELSE tf.time END),tt.time, '[)') as virkning\    
FROM postnumre_history p \
LEFT JOIN transaction_history tf ON p.valid_from = tf.sequence_number \
LEFT JOIN transaction_history tt ON p.valid_to = tt.sequence_number)`);
});

const adgAdrCols = ['id', 'hn_statuskode', 'ap_statuskode', 'husnr', 'postnr', 'postnrnavn', 'supplerendebynavn', 'kommunekode', 'vejkode', 'vejnavn', 'adresseringsvejnavn'];
const adrCols = [...adgAdrCols, 'adgangsadresseid', 'statuskode', 'etage', 'doer'];

module.exports = {
  createHeadTailTempTable,
  TableInserter,
  createTempHistoryTable,
  mergeValidTime,
  processAdgangsadresserHistory,
  processAdresserHistory,
  createVejstykkerPostnumreHistory,
  createPostnumreHistory,
  cutoffAfter,
  cutoffBefore,
  adgAdrCols,
  adrCols
};

