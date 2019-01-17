"use strict";

const {expect, assert} = require('chai');

const q = require('q');

const testdb = require('@dawadk/test-util/src/testdb');
const {go} = require('ts-csp');
const {withImportTransaction} = require('../../../importUtil/transaction-util');
const { setInitialMeta } = require('../../../dar10/import-dar-util')
const { internal: { importChangeset } } = require('../../../components/importers/dar-api');
const darHistoryProcessor = require('../../../components/processors/dar-history');
const darCurrentProcessor = require('../../../components/processors/dar-current');
const dawaMaterializedProcessor = require('../../../components/processors/dawa-materialized-incremental');

const { SAMPLE_CHANGESET } = require('../importers/dar-api-spec');

const Postnummer = {
  "eventopret": null,
  "eventopdater": null,
  "rowkey": 1,
  "id": "95702e68-d06b-4b33-b1c9-4dc117272958",
  "registreringfra": "2015-11-12T23:14:55.760Z",
  "registreringtil": null,
  "virkningfra": "1753-01-01T00:00:00Z",
  "virkningtil": null,
  "status": "3",
  "navn": "København K",
  "postnr": "1152",
  "postnummerinddeling": "191152"
};
const DARKommuneinddeling = {
  "eventopret": null,
  "eventopdater": null,
  "rowkey": 4,
  "id": "374cc63a-9c9a-4da4-9427-1de69091c30e",
  "registreringfra": "2015-11-12T23:14:55.760Z",
  "registreringtil": null,
  "virkningfra": "1753-01-01T00:00:00Z",
  "virkningtil": null,
  "status": "3",
  "kommuneinddeling": "389135",
  "kommunekode": "0253",
  "navn": "Greve"
};
const NavngivenVejKommunedel = {
  "eventopret": null,
  "eventopdater": null,
  "rowkey": 96934,
  "id": "5ca35fdf-4eae-11e8-93fd-066cff24d637",
  "registreringfra": "2015-11-12T23:14:55.760Z",
  "registreringtil": null,
  "virkningfra": "1900-01-01T12:00:00Z",
  "virkningtil": null,
  "status": "3",
  "kommune": "0253",
  "navngivenvej_id": "1319b489-2490-5e77-e044-0003ba298018",
  "vejkode": "0062"
};
const NavngivenVej = {
  "eventopret": null,
  "eventopdater": null,
  "rowkey": 710,
  "id": "1319b489-2490-5e77-e044-0003ba298018",
  "registreringfra": "2015-11-12T23:14:55.760Z",
  "registreringtil": null,
  "virkningfra": "1900-01-01T12:00:00Z",
  "virkningtil": null,
  "status": "3",
  "administreresafkommune": "0326",
  "beskrivelse": null,
  "retskrivningskontrol": "Godkendt",
  "udtaltvejnavn": "Athenesvej",
  "vejadresseringsnavn": "Athenesvej",
  "vejnavn": "Athenesvej",
  "vejnavnebeliggenhed_oprindelse_kilde": "Ekstern",
  "vejnavnebeliggenhed_oprindelse_nøjagtighedsklasse": "B",
  "vejnavnebeliggenhed_oprindelse_registrering": "2015-11-12T23:14:55.760Z",
  "vejnavnebeliggenhed_oprindelse_tekniskstandard": "N0",
  "vejnavnebeliggenhed_vejnavnelinje": null,
  "vejnavnebeliggenhed_vejnavneområde": null,
  "vejnavnebeliggenhed_vejtilslutningspunkter": null
};
const firstHusnummer = {
  "eventopret": 1,
  "eventopdater": null,
  "rowkey": 9,
  "id": "0437a3ca-9886-48ea-90c8-504b68d179e6",
  "registreringfra": "2015-11-12T23:14:55.760Z",
  "registreringtil": null,
  "virkningfra": "2015-11-12T23:14:55.760Z",
  "virkningtil": null,
  "status": "3",
  "adgangsadressebetegnelse": "Sø Svenstrup Byvej 25, 4130 Viby Sjælland",
  "adgangspunkt_id": "0a3f5081-d7c2-32b8-e044-0003ba298018",
  "darafstemningsområde_id": "bee5d5a8-2e16-473d-851d-61b59079dd4b",
  "darkommune_id": "374cc63a-9c9a-4da4-9427-1de69091c30e",
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
  "navngivenvej_id": "1319b489-2490-5e77-e044-0003ba298018",
  "postnummer_id": "95702e68-d06b-4b33-b1c9-4dc117272958",
  "supplerendebynavn_id": null,
  "vejpunkt_id": "79740068-fbe9-11e5-a32f-063320a53a26"
}
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
  Adresse: [Object.assign({}, firstAdresse)],
  Husnummer: [Object.assign({}, firstHusnummer)],
  DARKommuneinddeling: [Object.assign({}, DARKommuneinddeling)],
  NavngivenVej: [Object.assign({}, NavngivenVej)],
  NavngivenVejKommunedel: [Object.assign({}, NavngivenVejKommunedel)],
  Postnummer: [Object.assign({}, Postnummer)]
};

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
    etagebetegnelse: 'st',
    dørbetegnelse: 'tv'
  })];

const secondChangeset = {
  Adresse: change
};

module.exports = {
  firstChangeset,
  secondChangeset
};

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
}

const simulateImport = (client, txid, changeset) => go(function*() {
  yield importChangeset(client, txid, JSON.parse(JSON.stringify(changeset)));
  yield darHistoryProcessor.executeIncrementally(client, txid);
  yield darCurrentProcessor.executeIncrementally(client, txid);
  yield dawaMaterializedProcessor.executeIncrementally(client, txid);
});

describe('Beregning af afledte DAWA opslagstabeller', function () {
  testdb.withTransactionEach('empty', clientFn => {
    it('Adgangsadresser are updated when any entity that is part of the address changes', q.async(function* () {
      const client = clientFn();

      const makeUpdate = (currentRecord, time, newProps) => {
        const result = Object.assign({}, currentRecord, newProps);
        return [
          Object.assign({}, currentRecord, {
            registreringtil: time
          }),
          Object.assign({}, result, {
            registreringfra: time,
            virkningtil: time,
          }, {rowkey: getRandomInt(0, 1000000000)}),
          Object.assign({}, result, {
            registreringfra: time,
            virkningfra: time
          }, {rowkey: getRandomInt(0, 1000000000)})]
      };
      yield setInitialMeta(client);
      yield withImportTransaction(client, 'importDar', (txid) => go(function* () {
        yield simulateImport(client, txid, JSON.parse(JSON.stringify(SAMPLE_CHANGESET)));
      }));
      // check that address is updated when vejkode changes
      const time2 = '2016-04-22T00:00:00Z';
      const navngivenVejKommunedelChange = {
        NavngivenVejKommunedel: makeUpdate(SAMPLE_CHANGESET.NavngivenVejKommunedel[0], time2, {
          vejkode: "0700"
        })
      };
      yield withImportTransaction(client, 'importDar', (txid) => go(function* () {
        yield simulateImport(client, txid, navngivenVejKommunedelChange);
      }));
      let updatedAddress = (yield client.queryRows('select * from adgangsadresser'))[0];
      expect(updatedAddress.vejkode).to.equal(700);


      // check that address postnummer is updated when postnummer changes
      const time3 = '2016-04-23T00:00:00Z';
      const postnummerChange = {
        Postnummer: makeUpdate(SAMPLE_CHANGESET.Postnummer[0], time3, {
          postnr: "5000"
        })
      };
      yield withImportTransaction(client, 'importDar', (txid) => go(function* () {
        yield simulateImport(client, txid, postnummerChange);
      }));

      updatedAddress = (yield client.queryp('select * from adgangsadresser')).rows[0];
      expect(updatedAddress.postnr).to.equal(5000);
    }));

    it('Enhedsadresser opdateres', () => go(function* () {
      const client = clientFn();


      yield withImportTransaction(client, 'importDar', (txid) => go(function* () {
        yield simulateImport(client, txid, firstChangeset);
      }));

      const firstResult = yield client.queryRows('select * from enhedsadresser');
      assert.strictEqual(firstResult.length, 1);
      const firstRow = firstResult[0];
      assert.strictEqual(firstRow.oprettet, '2015-11-13T00:14:55.76');
      assert.strictEqual(firstRow.aendret, '2015-11-13T00:14:55.76');
      assert.strictEqual(firstRow.objekttype, 1);

      yield withImportTransaction(client, 'importDar', (txid) => go(function* () {
        yield simulateImport(client, txid, secondChangeset);
      }));

      const result2 = yield client.queryRows('select * from enhedsadresser');
      // selvom der nu er to rækker i den originale DAR historik, bør vores egen komprimerede
      // historik kun indeholde én, da alle andre felter end adressebetegnelse er identiske.
      assert.strictEqual(result2.length, 1);
      const row2 = result2[0];
      assert.strictEqual(row2.oprettet, '2015-11-13T00:14:55.76');
      assert.strictEqual(row2.aendret, '2016-11-13T00:14:55.76');
      assert.strictEqual(row2.etage, 'st');
      assert.strictEqual(row2.doer, 'tv');
    }));
  });
});
