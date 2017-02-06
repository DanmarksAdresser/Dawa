"use strict";

const expect = require('chai').expect;
const q = require('q');
const _ = require('underscore');

const darApiClient = require('../../dar10/darApiClient');
const importDarImpl = require('../../dar10/importDarImpl');
const importFromApiImpl = require('../../dar10/importFromApiImpl');
const testdb = require('../helpers/testdb2');


q.longStackSupport = true;

function fakeDarClient(rowsMap, batchSize) {
  return {
    getEventStatus: () => {
      return q.resolve(_.mapObject(rowsMap, (rows) => _.max(rows.map(row => row.eventid))));
    },
    getRecordsPage: (eventStart, eventSlut, entitet, startindeks) => {
      const matching = rowsMap[entitet].filter(row => row.eventid >= eventStart && row.eventid <= eventSlut);
      let restindeks = null;
      if(matching.length > startindeks + batchSize) {
        restindeks = startindeks + batchSize;
      }
      const records = matching.slice(startindeks, Math.min(startindeks + batchSize, matching.length));
      return q.resolve({
        records: records,
        restindeks: restindeks
      });
    }
  }
}

describe('Import from DAR 1.0 API', () => {
  it('Can create the correct URL for getting records', () => {
    const url = darApiClient.recordsUrl('https://foo:8080/bar', 10, 20, 'Adresse', 100);
    expect(url).to.equal('https://foo:8080/bar/Records?Eventstart=10&Eventslut=20&Entitet=Adresse&Startindeks=100');
  });

  testdb.withTransactionEach('empty', (clientFn) => {
    it('Can fetch current event ids from an empty database', q.async(function*() {
      const eventIds = yield importFromApiImpl.internal.getCurrentEventIds(clientFn());
      expect(eventIds).to.deep.equal({ Adresse: 0,
        Adressepunkt: 0,
        'DARAfstemningsområde': 0,
        DARKommuneinddeling: 0,
        'DARMenighedsrådsafstemningsområde': 0,
        DARSogneinddeling: 0,
        Husnummer: 0,
        NavngivenVej: 0,
        NavngivenVejKommunedel: 0,
        NavngivenVejPostnummerRelation: 0,
        NavngivenVejSupplerendeBynavnRelation: 0,
        Postnummer: 0,
        ReserveretVejnavn: 0,
        SupplerendeBynavn: 0 });
    }));
    it('Can fetch current event ids from a populated database', q.async(function*() {
      const changeset = {
        Postnummer: [{
          "eventopret": 1,
          "eventopdater": null,
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
        }, {
          "eventopret": 2,
          "eventopdater": 3,
          "rowkey": 70,
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
      };
      const client = clientFn();
      yield importDarImpl.internal.setInitialMeta(client);
      yield importDarImpl.withDar1Transaction(client, 'api', q.async(function*() {
        yield importDarImpl.importChangeset(client, JSON.parse(JSON.stringify(changeset)));
      }));


      const eventIds = yield importFromApiImpl.internal.getCurrentEventIds(clientFn());

      expect(eventIds.Postnummer).to.equal(3);
    }));

    it('Can split set of records into transactions according to registration time', () => {
      const changeset = {
        Postnummer: [{
          registreringfra: "2016-04-21T00:00:00Z",
          registreringtil: null
        }, {
          registreringfra: "2016-04-21T00:00:00Z",
          registreringtil: "2016-04-22T00:00:00Z"
        },{
          registreringfra: "2016-04-22T00:00:00Z"
        }]
      };
      const transactions = importFromApiImpl.internal.splitInTransactions(changeset);
      expect(transactions).to.deep.equal([{
        Postnummer: [changeset.Postnummer[0]]
      }, {
        Postnummer: [changeset.Postnummer[1], changeset.Postnummer[2]]
      }]);
    });

    // TODO is eventslut inclusive or not? This test assumes it is.
    it('Can fetch rows from DAR in multiple batches', q.async(function*() {
      const fakeData = {Postnummer: [{eventid: 1}, {eventid: 2}, {eventid: 3},
      {eventid: 4}, { eventid: 5}]};
      const darClient = fakeDarClient(fakeData, 2);
      const result = yield importFromApiImpl.internal.getRecords(darClient, 1, 5, 'Postnummer');
      expect(result).to.deep.equal(fakeData.Postnummer);
    }));

    it('Will fetch and import rows in multiple  transactions', q.async(function*() {
      // setup remote with two transactions.
      const fakeData = {
        Postnummer: [{
          "eventid": 1,
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
        }, {
          "eventid": 2,
          "rowkey": 69,
          "id": "873e4c91-c2d3-4674-a491-2f0e30bac7eb",
          "registreringfra": "2016-04-21T00:00:00Z",
          "registreringtil": "2016-04-22T00:00:00Z",
          "virkningfra": "2016-04-21T00:00:00Z",
          "virkningtil": null,
          "status": "3",
          "navn": "Viby Sjælland",
          "postnr": "4130",
          "postnummerinddeling": "250767"
        }, {
          "eventid": 3,
          "rowkey": 70,
          "id": "873e4c91-c2d3-4674-a491-2f0e30bac7eb",
          "registreringfra": "2016-04-22T00:00:00Z",
          "registreringtil": null,
          "virkningfra": "2016-04-21T00:00:00Z",
          "virkningtil": null,
          "status": "1",
          "navn": "Viby Sjælland",
          "postnr": "4130",
          "postnummerinddeling": "250767"
        }]
      };
      const darClient = fakeDarClient(fakeData, 10);
      const client = clientFn();
      yield importDarImpl.internal.setInitialMeta(client);
      yield importFromApiImpl.internal.fetchAndImport(
        client,
        darClient,
        {
          Postnummer: 5
        });
      const transactions = (yield client.queryp('select * from dar1_transaction')).rows;
      const records = (yield client.queryp('select * from dar1_postnummer order by rowkey')).rows;
      expect(transactions).to.have.length(2);
      expect(records).to.have.length(2);
      const first = records[0];
      expect(first.eventopret).to.equal(1);
      expect(first.eventopdater).to.equal(2);
      expect(first.status).to.equal(3);
      const second = records[1];
      expect(second.eventopret).to.equal(3);
      expect(second.eventopdater).to.be.null;
      expect(second.status).to.equal(1);
    }));
  });
});
