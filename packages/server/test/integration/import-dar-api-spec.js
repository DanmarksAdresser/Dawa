"use strict";

const { assert } = require('chai');
const Promise = require('bluebird');
const { withPoolAll } = require('@dawadk/test-util/src/testdb');
const notificationsServerImpl = require('@dawadk/dar-notification-server/src/notificationsImpl');
const { go, Abort } = require('ts-csp');
const request = require('request-promise');
const {importDaemon} = require('../../dar10/importFromApiImpl');

function fakeDarClient(rowsMap, batchSize) {
  return {
    getEventStatus: () => {
      return Promise.resolve([{"entitet":"Postnummer","eventid":4}]);
    },
    getRecordsPage: (eventStart, eventSlut, entitet, startindeks) => {
      const matching = (rowsMap[entitet] || []).filter(row => row.eventid >= eventStart && row.eventid <= eventSlut);
      let restindeks = null;
      if (matching.length > startindeks + batchSize) {
        restindeks = startindeks + batchSize;
      }
      const records = matching.slice(startindeks, Math.min(startindeks + batchSize, matching.length));
      return Promise.resolve({
        records: records,
        restindeks: restindeks
      });
    }
  }
}


describe('DAR API import integration ', () => {
  let notificationsServer;
  beforeEach(() => {
    notificationsServer = notificationsServerImpl.createNotificationApp({port: 4001});
    notificationsServer.listen(4001);
  });

  afterEach(() => {
    notificationsServer.close();
  });
  withPoolAll('empty', pool => {
    it('A notification from DAR triggers a successful import', () => go(function*() {
      const darClient = fakeDarClient({
        Postnummer: [{
          "eventid": 5,
          "rowkey": 69,
          "id": "873e4c91-c2d3-4674-a491-2f0e30bac7eb",
          "registreringfra": "2016-04-21T00:00:00Z",
          "registreringtil": null,
          "virkningfra": "2016-04-21T00:00:00Z",
          "virkningtil": null,
          "status": "3",
          "navn": "Viby Sjælland",
          "postnr": "4130",
          "postnummerinddeling": "250767"
        }]
      }, 10);

      const importProcess = importDaemon(pool, darClient,
        {
          pretend: false,
          noDaemon: false,
          pollIntervalMs: 5000,
          notificationUrl: 'http://localhost:4001/prod/listen' }
      );

      // we need a long delay to simulate import using status page
      yield Promise.delay(5000);

      // simulate notification received from DAR
      const notification = [
        {
          "entitet": "Postnummer",
          "eventid": 5
        }
      ];
      const response = yield request.post({
        uri: 'http://localhost:4001/prod/notify',
        json: true,
        body: notification
      });
      assert.deepStrictEqual(response, {});
      yield Promise.delay(1000);
      importProcess.abort.raise("Aborting test");
      try {
        yield importProcess;
      }
      catch(e) {
        assert.instanceOf(e, Abort);
      }
      yield pool.withTransaction('READ_WRITE', client => go(function*() {
        const result = yield client.queryRows(`SELECT * FROM dar1_postnummer_current`);
        assert.strictEqual(result[0].id, '873e4c91-c2d3-4674-a491-2f0e30bac7eb');
      }));
    }));
  });
});
