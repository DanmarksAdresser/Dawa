"use strict";
const { assert } = require('chai');
const  {withTransactionEach} = require('../helpers/testdb2');
const { go } = require('ts-csp');
const { Range } = require('../../psql/databaseTypes');

const {internal: {prepareDar1Postnummer, preparePostnummerHistory, mergePostnr, prepareDar1Husnummer}} = require('../../history/generateHistoryImplDar1');

const insert = (client, tableName, row) => {
  const columns = Object.keys(row);
  const sql = `INSERT INTO ${tableName}(${columns.join(', ')})
  VALUES (${columns.map((column, index) => `$${index+1}`).join(',')})`;
  const args = columns.map(column => row[column]);
  return client.query(sql, args);
};
describe('Generate history DAR1', () => {
  withTransactionEach('empty', clientFn => {
    it('Correctly merges postnummer history from DAWA and DAR1', () => go(function*() {
      const client = clientFn();
      const postnrDarId = '7b5b97c0-73ca-47d5-9bc6-1eb0791ac44e';
      const husnummerId = '1d8442e2-c891-40ac-9fcc-6840d8681731';
      const dummyId = 'c21fb40c-ac00-43b1-b8d0-fae58df4fcdc';
      const time1 = '2017-01-01T00:00:00Z';
      const time2 = '2017-02-01T00:00:00Z';
      const time3 = '2017-03-01T00:00:00Z';
      yield insert(clientFn(), 'dar1_postnummer', {
        rowkey: 1,
        id: postnrDarId,
        registrering: new Range(time1, null, '[)'),
        virkning: new Range(time1, null, '[)'),
        status: 1,
        postnr: 8000,
        navn: 'Aarhus C'
      })
      yield insert(clientFn(), 'dar1_husnummer', {
        rowkey: 1,
        id: husnummerId,
        registrering: new Range(time1, null, '[)'),
        virkning: new Range(time1, null, '[)'),
        status: 1,
        postnummer_id: postnrDarId,
        adgangspunkt_id: dummyId,
        darafstemningsområde_id: dummyId,
        darkommune_id: dummyId,
        darsogneinddeling_id: dummyId,
        vejpunkt_id: dummyId
      });
      yield insert(clientFn(), 'adgangsadresser_changes', {
        operation: 'insert',
        id: husnummerId,
        postnr: '8260',
        txid: 10
      });
      yield insert(client, 'transaction_history', {
        sequence_number: 10000,
        time: time2,
        operation: 'update',
        entity: 'adgangsadresse',
        txid: 2
      });
      yield insert(client, 'adgangsadresser_changes', {
        operation: 'update',
        changeid: 10000,
        id: husnummerId,
        postnr: '8000',
        txid: 2
      });
      yield insert(client, 'postnumre', {
        nr: 8260,
        navn: 'Viby J'
      });
      yield insert(client, 'postnumre', {
        nr: 8000,
        navn: 'Aarhus C'
      });
      yield prepareDar1Husnummer(client);
      yield prepareDar1Postnummer(client);
      yield preparePostnummerHistory(client, time3);
      yield mergePostnr(client);
      const result = yield client.queryRows(`select * from postnummer_merged order by lower(virkning)`);
      assert.strictEqual(result.length, 2);
      assert.strictEqual(result[0].postnr, 8260);
      assert.strictEqual(result[1].postnr, 8000);
    }));
  });
});
