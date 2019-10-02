"use strict";

const path = require('path');
const { assert } = require('chai');
const testdb = require('@dawadk/test-util/src/testdb');
const {go} = require('ts-csp');
const {withImportTransaction} = require('../../../importUtil/transaction-util');
const createOisImporter = require('../../../components/importers/ois');

describe('Import GRBBR', function () {
    this.timeout(60000);
    testdb.withTransactionEach('test', (clientFn) => {
        it('Kan importere deltafiler med oprettelse og afslutning i samme transaktion', () => go(function* () {
            let saved_txid;
            const client = clientFn();
            const importer = createOisImporter({dataDir: path.join(__dirname, 'ois-spec/delta')});
            yield withImportTransaction(client, 'importDar', (txid) => go(function* () {
                saved_txid = txid;
                yield importer.execute(client, txid);
            }));
            const result = yield client.queryRows(
                'select txid, id, rowkey, registrering,changeid from bbr_bygning_changes where txid = $1',[saved_txid]);
            assert.strictEqual(result.length, 1);
            assert(!result[0].registrering.upperInfinite);
            assert.isNumber(result[0].changeid);
        }));
    });
});