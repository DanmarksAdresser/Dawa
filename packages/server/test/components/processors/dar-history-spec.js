"use strict";

const { assert } = require('chai');
const testdb = require('@dawadk/test-util/src/testdb');
const {go} = require('ts-csp');
const {withImportTransaction} = require('../../../importUtil/transaction-util');
const { internal: { importChangeset } } = require('../../../components/importers/dar-api');
const darHistoryProcessors = require('../../../components/processors/dar-history');
const EXECUTION_STRATEGY = require('../../../components/common');
const { execute } = require('../../../components/execute');
const simulateImport = (client, txid, changeset) => go(function*() {
  yield importChangeset(client, txid, JSON.parse(JSON.stringify(changeset)));
  yield execute(client, txid, darHistoryProcessors, EXECUTION_STRATEGY.preferIncremental);
});

describe('Beregning af DAR historiske entiteter', function () {
  testdb.withTransactionEach('empty', clientFn => {

    it('Historik bliver komprimeret', () => go(function* () {
      const client = clientFn();
      const firstAdresse = {
        "eventopret": 1,
        "eventopdater": null,
        "rowkey": 10,
        "id": "59b174ea-d060-4838-a238-00011004bc44",
        "registreringfra": "2015-11-12T23:14:55.76Z",
        "registreringtil": null,
        "virkningfra": "2015-11-12T23:14:55.76Z",
        "virkningtil": null,
        "status": "3",
        "adressebetegnelse": "Okavangovej 8, Vinge, 3600 Frederikssund",
        "dørbetegnelse": "",
        "dørpunkt_id": null,
        "etagebetegnelse": "",
        "fk_bbr_bygning_bygning": null,
        "husnummer_id": "0437a3ca-9886-48ea-90c8-504b68d179e6"
      };
      const firstChangeset = {
        Adresse: [Object.assign({}, firstAdresse)]
      };

      yield withImportTransaction(client, 'importDar', (txid) => go(function* () {
        yield simulateImport(client, txid, firstChangeset);
      }));

      const result = yield client.queryRows('select rowkey, lower(virkning) as virkningfra, upper(virkning) as virkningtil  from dar1_adresse_history');
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0].virkningfra, "2015-11-12T23:14:55.760Z");
      assert.strictEqual(result[0].virkningtil, null);
      const initialRowkey = result[0].rowkey;

      // Vi laver en ændring hvor adressebegnelsen er ændret. Den bør komprimeres væk ved import.
      const change = [
        Object.assign({}, firstAdresse, {
          eventopdater: 2,
          registreringtil: '2016-11-12T23:14:55.76Z'
        }),
        Object.assign({}, firstAdresse, {
          eventopret: 2,
          rowkey: 11,
          registreringfra: '2016-11-12T23:14:55.76Z',
          virkningtil: '2016-11-12T23:14:55.76Z'
        }),
        Object.assign({}, firstAdresse, {
          eventopret: 2,
          rowkey: 12,
          registreringfra: '2016-11-12T23:14:55.76Z',
          virkningfra: '2016-11-12T23:14:55.76Z',
          adressebetegnelse: "Okavangovej OPDATERET 8, Vinge, 3600 Frederikssund"
        })];

      const secondChangeset = {
        Adresse: change
      };

      yield withImportTransaction(client, 'importDar', (txid) => go(function* () {
        yield simulateImport(client, txid, secondChangeset);
      }));

      const result2 = yield client.queryRows('select rowkey, lower(virkning) as virkningfra, upper(virkning) as virkningtil from dar1_adresse_history');
      // selvom der nu er to rækker i den originale DAR historik, bør vores egen komprimerede
      // historik kun indeholde én, da alle andre felter end adressebetegnelse er identiske.
      assert.strictEqual(result2.length, 1);
      const historyRow = result2[0];
      assert.strictEqual(historyRow.rowkey, initialRowkey);
      assert.strictEqual(historyRow.virkningfra, "2015-11-12T23:14:55.760Z");
      assert.isNull(historyRow.virkningtil);
    }));
  });
});