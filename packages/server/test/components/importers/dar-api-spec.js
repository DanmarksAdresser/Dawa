"use strict";

const {expect, assert} = require('chai');
const {go} = require('ts-csp');
const _ = require('underscore');
const Promise = require('bluebird');
const {
  createDarApiImporter,
  internal: {
    getRecordsForEntity,
    fetchAndImport,
    getCurrentEventIds,
    importChangeset
  }
} =
  require('../../../components/importers/dar-api');
const {setInitialMeta, setVirkningTime, ALL_DAR_ENTITIES, getMeta} = require('../../../dar10/import-dar-util');
const testdb = require('@dawadk/test-util/src/testdb');
const {withImportTransaction} = require('../../../importUtil/transaction-util');
const darApiClient = require('../../../dar10/darApiClient');

function fakeDarClient(rowsMap, batchSize) {
  return {
    getEventStatus: () => {
      return Promise.resolve(_.mapObject(rowsMap, (rows) => _.max(rows.map(row => row.eventid))));
    },
    getRecordsPage: (eventStart, eventSlut, entitet, startindeks) => {
      const matching = rowsMap[entitet].filter(row => row.eventid >= eventStart && row.eventid <= eventSlut);
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

const SAMPLE_CHANGESET = {
  Adressepunkt: [{
    "eventopret": null,
    "eventopdater": null,
    "rowkey": 6277708,
    "id": "0a3f5081-d7c2-32b8-e044-0003ba298018",
    "registreringfra": "2016-04-21T00:00:00Z",
    "registreringtil": null,
    "virkningfra": "2016-04-21T00:00:00Z",
    "virkningtil": null,
    "status": "8",
    "oprindelse_kilde": "Adressemyn",
    "oprindelse_nøjagtighedsklasse": "A",
    "oprindelse_registrering": "2011-12-13T11:46:43.177Z",
    "oprindelse_tekniskstandard": "TD",
    "position": "POINT (688947.86 6159449.31)"
  }, { // vejpunkt
    "eventopret": null,
    "eventopdater": null,
    "rowkey": 6277709,
    "id": "79740068-fbe9-11e5-a32f-063320a53a26",
    "registreringfra": "2016-04-21T00:00:00Z",
    "registreringtil": null,
    "virkningfra": "2016-04-21T00:00:00Z",
    "virkningtil": null,
    "status": "8",
    "oprindelse_kilde": "Adressemyn",
    "oprindelse_nøjagtighedsklasse": "A",
    "oprindelse_registrering": "2011-12-13T11:46:43.177Z",
    "oprindelse_tekniskstandard": "TD",
    "position": "POINT (688947.86 6159449.31)"
  }],
  Adresse: [{
    "eventopret": null,
    "eventopdater": null,
    "rowkey": 98694,
    "id": "0a3f50ab-bc01-32b8-e044-0003ba298018",
    "registreringfra": "2016-04-21T00:00:00Z",
    "registreringtil": null,
    "virkningfra": "2016-04-21T00:00:00Z",
    "virkningtil": null,
    "status": "3",
    "adressebetegnelse": "Sø Svenstrup Byvej 25, 4130 Viby Sjælland",
    "dørbetegnelse": "",
    "dørpunkt_id": null,
    "etagebetegnelse": "",
    "fk_bbr_bygning_bygning": null,
    "husnummer_id": "0a3f5081-d7c2-32b8-e044-0003ba298018"
  }],
  Husnummer: [{
    "eventopret": null,
    "eventopdater": null,
    "rowkey": 4720139,
    "id": "0a3f5081-d7c2-32b8-e044-0003ba298018",
    "registreringfra": "2016-04-21T00:00:00Z",
    "registreringtil": null,
    "virkningfra": "2016-04-21T00:00:00Z",
    "virkningtil": null,
    "status": "3",
    "adgangsadressebetegnelse": "Sø Svenstrup Byvej 25, 4130 Viby Sjælland",
    "adgangspunkt_id": "0a3f5081-d7c2-32b8-e044-0003ba298018",
    "darafstemningsområde_id": "bee5d5a8-2e16-473d-851d-61b59079dd4b",
    "darkommune_id": "e604599c-1cb8-4bf8-a78a-594ae303ee03",
    "darmenighedsrådsafstemningsområde_id": "8e238ea8-9ab1-4de8-b6e1-bfb7d5180eba",
    "darsogneinddeling_id": "a161a121-92af-494e-9280-27eeba3c952d",
    "fk_bbr_bygning_adgangtilbygning": null,
    "fk_bbr_tekniskanlæg_adgangtiltekniskanlæg": null,
    "fk_geodk_bygning_geodanmarkbygning": "1023025565",
    "fk_geodk_vejmidte_vejmidte": "1023123684",
    "fk_mu_jordstykke_foreløbigtplaceretpåjordstykke": null,
    "fk_mu_jordstykke_jordstykke": "2221014",
    "husnummerretning": "POINT (-0.896849582121619 0.442335649759634)",
    "husnummertekst": "25",
    "navngivenvej_id": "e17d4273-ad3d-496f-85b1-73bba8b1a707",
    "postnummer_id": "873e4c91-c2d3-4674-a491-2f0e30bac7eb",
    "supplerendebynavn_id": null,
    "vejpunkt_id": "79740068-fbe9-11e5-a32f-063320a53a26"
  }],
  DARKommuneinddeling: [{
    "eventopret": null,
    "eventopdater": null,
    "rowkey": 1534,
    "id": "e604599c-1cb8-4bf8-a78a-594ae303ee03",
    "registreringfra": "2016-04-21T00:00:00Z",
    "registreringtil": null,
    "virkningfra": "2016-04-21T00:00:00Z",
    "virkningtil": null,
    "status": "3",
    "kommuneinddeling": "249615",
    "kommunekode": "265",
    "navn": "Roskilde"
  }],
  NavngivenVej: [{
    "eventopret": null,
    "eventopdater": null,
    "rowkey": 6259,
    "id": "e17d4273-ad3d-496f-85b1-73bba8b1a707",
    "registreringfra": "2016-04-21T00:00:00Z",
    "registreringtil": null,
    "virkningfra": "2016-04-21T00:00:00Z",
    "virkningtil": null,
    "status": "3",
    "administreresafkommune": "0265",
    "beskrivelse": null,
    "retskrivningskontrol": "4",
    "udtaltvejnavn": "Sø Svenstrup Byvej",
    "vejadresseringsnavn": "Sø Svenstrup Byvej",
    "vejnavn": "Sø Svenstrup Byvej",
    "vejnavnebeliggenhed_oprindelse_kilde": "Ekstern",
    "vejnavnebeliggenhed_oprindelse_nøjagtighedsklasse": "B",
    "vejnavnebeliggenhed_oprindelse_registrering": "2016-04-06T13:24:14.91Z",
    "vejnavnebeliggenhed_oprindelse_tekniskstandard": "NO",
    "vejnavnebeliggenhed_vejnavnelinje": "GEOMETRYCOLLECTION EMPTY",
    "vejnavnebeliggenhed_vejnavneområde": "POLYGON ((689614.504882 6159819.35656, 689711.933656 6159597.59578, 688475.328649 6159054.30353, 688377.899875 6159276.0643, 689614.504882 6159819.35656))",
    "vejnavnebeliggenhed_vejtilslutningspunkter": "GEOMETRYCOLLECTION EMPTY"
  }],
  NavngivenVejKommunedel: [{
    "eventopret": null,
    "eventopdater": null,
    "rowkey": 6225,
    "id": "a322db74-f805-11e5-aaa8-063320a53a26",
    "registreringfra": "2016-04-21T00:00:00Z",
    "registreringtil": null,
    "virkningfra": "2016-04-21T00:00:00Z",
    "virkningtil": null,
    "status": "3",
    "kommune": "0265",
    "navngivenvej_id": "e17d4273-ad3d-496f-85b1-73bba8b1a707",
    "vejkode": "0658"
  }],
  Postnummer: [{
    "eventopret": null,
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
  }],
  NavngivenVejPostnummerRelation: [{
    "eventopret": null,
    "eventopdater": null,
    "rowkey": 69,
    "id": "873e4c91-c2d3-4674-a491-2f0e30bac7eb",
    "registreringfra": "2016-04-21T00:00:00Z",
    "registreringtil": null,
    "virkningfra": "2016-04-21T00:00:00Z",
    "virkningtil": null,
    "status": "3",
    "navngivenvej_id": "e17d4273-ad3d-496f-85b1-73bba8b1a707",
    "postnummer_id": "873e4c91-c2d3-4674-a491-2f0e30bac7eb"
  }]
};

describe('Import af changeset', () => {
  testdb.withTransactionEach('empty', clientFn => {

    it('Kan importere et changeset', () => go(function* () {
      const client = clientFn();
      yield setInitialMeta(client);
      yield withImportTransaction(client, 'importDar', (txid) => go(function* () {
        yield importChangeset(client, txid, JSON.parse(JSON.stringify(SAMPLE_CHANGESET)));
      }));
      // verify a selection of attribute values
      const navngivenvej = (yield client.queryRows(`select * from dar1_navngivenvej`))[0];
      assert.strictEqual(navngivenvej.id, "e17d4273-ad3d-496f-85b1-73bba8b1a707");
      const husnummer = (yield client.queryRows(`select * from dar1_husnummer`))[0];
      assert.strictEqual(husnummer.id, "0a3f5081-d7c2-32b8-e044-0003ba298018");
      assert.strictEqual(husnummer.husnummertekst.tal, 25);
      assert.isNull(husnummer.husnummertekst.bogstav);
      const position = (yield client.queryRows(`select st_astext(position) as position from dar1_adressepunkt`))[0].position;
      assert.strictEqual(position, 'POINT(688947.86 6159449.31)');
    }));

  });
});

describe('Import from DAR 1.0 API', () => {
  it('Can create the correct URL for getting records', () => {
    const url = darApiClient.recordsUrl('https://foo:8080/bar', 10, 20, 'Adresse', 100);
    expect(url).to.equal('https://foo:8080/bar/Records?Eventstart=10&Eventslut=20&Entitet=Adresse&Startindeks=100');
  });

  testdb.withTransactionEach('empty', (clientFn) => {
    it('Can fetch current event ids from an empty database', () => go(function* () {
      const eventIds = yield getCurrentEventIds(clientFn(), ALL_DAR_ENTITIES);
      expect(eventIds).to.deep.equal({
        Adresse: 0,
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
        SupplerendeBynavn: 0
      });
    }));
    it('Can fetch current event ids from a populated database', () => go(function* () {
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
          "id": "873e4c91-c2d3-4674-a491-2f0e30bac7ec",
          "registreringfra": "2016-04-21T00:00:00Z",
          "registreringtil": null,
          "virkningfra": "2016-04-21T00:00:00Z",
          "virkningtil": null,
          "status": "3",
          "navn": "Viby Sjælland",
          "postnr": "4131",
          "postnummerinddeling": "250767"
        }]
      };
      const client = clientFn();
      yield setInitialMeta(client);
      yield withImportTransaction(client, 'importDar', (txid) => go(function* () {
        yield importChangeset(client, txid, JSON.parse(JSON.stringify(changeset)));
      }));


      const eventIds = yield getCurrentEventIds(clientFn(), ALL_DAR_ENTITIES);

      expect(eventIds.Postnummer).to.equal(3);
    }));


    it('Can fetch rows from DAR in multiple batches', () => go(function* () {
      const fakeData = {
        Postnummer: [{eventid: 1}, {eventid: 2}, {eventid: 3},
          {eventid: 4}, {eventid: 5}]
      };
      const darClient = fakeDarClient(fakeData, 2);
      const result = yield getRecordsForEntity(darClient, 1, 5, 'Postnummer');
      expect(result).to.deep.equal(fakeData.Postnummer);
    }));

    it('Will advance virkning time if there is no transactions', () => go(function* () {
      const fakeData = {
        Postnummer: [{
          "eventid": 1,
          "rowkey": 69,
          "id": "873e4c91-c2d3-4674-a491-2f0e30bac7eb",
          "registreringfra": "2016-04-21T00:00:00Z",
          "registreringtil": null,
          "virkningfra": "2017-04-21T00:00:00Z",
          "virkningtil": null,
          "status": "3",
          "navn": "Viby Sjælland",
          "postnr": "4130",
          "postnummerinddeling": "250767"
        }]
      };

      const darClient = fakeDarClient(fakeData, 10);
      const client = clientFn();
      yield setVirkningTime(client, "2016-04-21T00:00:00Z");
      yield withImportTransaction(client, 'importDar', (txid) => go(function* () {
        yield fetchAndImport(
          client,
          txid,
          {},
          darClient,
          {
            Postnummer: 5
          },
          "2016-04-21T00:00:00Z",
          50, true);
      }));
      const meta = yield getMeta(client);
      assert.strictEqual(meta.virkning, "2016-04-21T00:00:00.000Z");
    }));

    it('Will fetch and import rows of multiple transactions', () => go(function* () {
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
      yield setInitialMeta(client);
      const context = {};
       yield withImportTransaction(client, 'importDarApiTest', (txid) => go(function* () {
       yield createDarApiImporter(
          {
            darClient,
            remoteEventIds: {Postnummer: 5}
          })
          .executeIncrementally(client, txid, context);
      }));
      assert.isDefined(context['dar-api']);
      assert.isDefined(context['dar-api']['remote-tx-timestamp']);
      assert.strictEqual(context['dar-api']['total-row-count'], 3);
      const records = yield client.queryRows('select * from dar1_postnummer order by rowkey');
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

module.exports = {SAMPLE_CHANGESET, fakeDarClient};