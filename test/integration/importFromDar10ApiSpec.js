"use strict";

const expect = require('chai').expect;
const q = require('q');
const importDarImpl = require('../../dar10/importDarImpl');
const importFromApiImpl = require('../../dar10/importFromApiImpl');
const testdb = require('../helpers/testdb');

q.longStackSupport = true;

describe('Import from DAR 1.0 API', () => {
  it('Can create the correct URL for getting records', () => {
    const url = importFromApiImpl.internal.recordsUrl('https://foo:8080/bar', 10, 20, 'Adresse', 100);
    expect(url).to.equal('https://foo:8080/bar/Records?Eventstart=10&Eventslut=20&Entitet=Adresse&Startindeks=100');
  });

  testdb.withTransactionEach('empty', (clientFn) => {
    it('Can fetch current event ids from an empty database', q.async(function*() {
      const eventIds = yield importFromApiImpl.internal.getCurrentEventIds(clientFn());
      expect(eventIds).to.deep.equal({
        adresse: 0,
        adressepunkt: 0,
        'darafstemningsområde': 0,
        darkommuneinddeling: 0,
        'darmenighedsrådsafstemningsområde': 0,
        darsogneinddeling: 0,
        husnummer: 0,
        navngivenvej: 0,
        navngivenvejkommunedel: 0,
        navngivenvejpostnummerrelation: 0,
        navngivenvejsupplerendebynavnrelation: 0,
        postnummer: 0,
        reserveretvejnavn: 0,
        supplerendebynavn: 0
      });
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

      expect(eventIds.postnummer).to.equal(3);
    }));
  });
});
