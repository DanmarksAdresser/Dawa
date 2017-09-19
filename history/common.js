"use strict";

const { Writable } = require('stream');
const util = require('util');
const _ = require('underscore');
const { go } = require('ts-csp');


const {allColumnNames, } = require('../importUtil/tableModelUtil');
const sqlUtil = require('../darImport/sqlUtil');

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


module.exports = {
  createHeadTailTempTable,
  TableInserter,
  createTempHistoryTable,
  mergeValidTime,
  processAdgangsadresserHistory,
  processAdresserHistory,
  createVejstykkerPostnumreHistory
};

