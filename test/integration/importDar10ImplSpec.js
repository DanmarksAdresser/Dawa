"use strict";

const expect = require('chai').expect;
const uuid = require('uuid');

const moment = require('moment');
const path = require('path');
const q = require('q');

const databaseTypes = require('../../psql/databaseTypes');
const dawaSpec = require('../../dar10/dawaSpec');
const importDarImpl = require('../../dar10/importDarImpl');
const testdb = require('../helpers/testdb2');

const Range = databaseTypes.Range;

describe('Import af DAR 1.0 udtræk', function () {
  this.timeout(10000);
  testdb.withTransactionEach('empty', (clientFn) => {
    it('Kan importere initielt udtræk', q.async(function*() {
      const client = clientFn();
      yield importDarImpl.importInitial(client, path.join(__dirname, '../data/dar10'));

      // check we actually imported some rows
      const queryResult = (yield client.queryp('select * from dar1_husnummer')).rows;
      expect(queryResult).to.have.length(3552);

      // check metadata has been updated
      const meta = yield importDarImpl.internal.getMeta(client);
      expect(meta.virkning).to.not.be.null;
      expect(meta.current_tx).to.be.null;
      expect(meta.last_event_id).to.equal(0);

      // check a transaction has been registered
      const transactions = (yield client.queryp('SELECT * FROM dar1_transaction')).rows;
      expect(transactions).to.have.length(1);
      const transaction = transactions[0];
      expect(transaction.id).to.equal(1);
      expect(transaction.ts).to.not.be.null;
      expect(transaction.dawa_seq_range).to.not.be.null;

      // check that DAWA entities has been created
      for (let dawaEntity of Object.keys(dawaSpec)) {
        const table = dawaSpec[dawaEntity].table;
        const count = (yield client.queryp(`SELECT COUNT(*) as c FROM ${table} `)).rows[0].c;
        expect(count).to.be.greaterThan(1);
      }
    }));

    it('Kan finde højeste eventid i udtræk', q.async(function*() {
      const client = clientFn();
      yield client.queryp(`INSERT INTO dar1_adresse(rowkey, id, eventopret, registrering, virkning, status, husnummer_id) 
      VALUES ($1, $2, $3, $4, $5, $6, $7)`, [
        1, uuid.v4(), 42, new Range(null, null, '()'), new Range(null, null, '()'), 1, uuid.v4()
      ]);
      const maxEventId = yield importDarImpl.internal.getMaxEventId(client, '');
      expect(maxEventId).to.equal(42);
    }));
  });
});

describe('Import af changesets', () => {
  testdb.withTransactionEach('empty', clientFn => {
    const INITIAL_CHANGESET = {
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

    it('Kan importere et changeset', q.async(function*() {
      const client = clientFn();
      yield importDarImpl.internal.setInitialMeta(client);
      yield importDarImpl.withDar1Transaction(client, 'api', q.async(function*() {
        yield importDarImpl.importChangeset(client, JSON.parse(JSON.stringify(INITIAL_CHANGESET)));
      }));

      // check at vi har importeret et vejstykke, adgangsadresse og adresse
      for (let dawaEntity of Object.keys(dawaSpec)) {
        const table = dawaSpec[dawaEntity].table;
        const count = (yield client.queryp(`SELECT COUNT(*)::integer as c FROM ${table} `)).rows[0].c;
        expect(count).to.equal(1);
      }

      // check, at vi logger noget historik
      const changelog = (yield client.queryp('select * from dar1_changelog')).rows;
      expect(changelog).to.have.length(8);
      const change = changelog[0];
      expect(change.tx_id).to.equal(1);
      expect(change.entity).to.not.be.empty;
      expect(change.operation).to.equal('insert');
      expect(change.rowkey).to.be.above(0);
    }));

    it('Når virkningstid avanceres, håndteres fremtidige ændringer', q.async(function*() {
      const client = clientFn();
      yield importDarImpl.internal.setInitialMeta(client);
      const now = (yield client.queryp('SELECT NOW() AS n')).rows[0].n;
      const future = moment(now).add(1, 'minutes').toISOString();

      const firstChangeset = {
        NavngivenVej: [{
          "eventopret": null,
          "eventopdater": null,
          "rowkey": 6259,
          "id": "e17d4273-ad3d-496f-85b1-73bba8b1a707",
          "registreringfra": now,
          "registreringtil": null,
          "virkningfra": future,
          "virkningtil": null,
          "status": "2",
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

        }]
      };

      // import a changeset with a change occuring in the future
      yield importDarImpl.withDar1Transaction(client, 'api', q.async(function*() {
        yield importDarImpl.importChangeset(client, JSON.parse(JSON.stringify(firstChangeset)));
      }));

      // check at vejen ikke eksisterer endnu
      const entityCount = (yield client.queryp('select count(*)::integer  as c from navngivenvej')).rows[0].c;
      expect(entityCount).to.equal(0);

      const secondChangeset = {
        NavngivenVej: [{
          "eventopret": null,
          "eventopdater": null,
          "rowkey": 6260,
          "id": "e17d4273-ad3d-496f-85b1-73bba8b1ffff",
          "registreringfra": future,
          "registreringtil": null,
          "virkningfra": future,
          "virkningtil": null,
          "status": "2",
          "administreresafkommune": "0265",
          "beskrivelse": null,
          "retskrivningskontrol": "4",
          "udtaltvejnavn": "Different Road",
          "vejadresseringsnavn": "Different Road",
          "vejnavn": "Different Road",
          "vejnavnebeliggenhed_oprindelse_kilde": "Ekstern",
          "vejnavnebeliggenhed_oprindelse_nøjagtighedsklasse": "B",
          "vejnavnebeliggenhed_oprindelse_registrering": "2016-04-06T13:24:14.91Z",
          "vejnavnebeliggenhed_oprindelse_tekniskstandard": "NO",
          "vejnavnebeliggenhed_vejnavnelinje": "GEOMETRYCOLLECTION EMPTY",
          "vejnavnebeliggenhed_vejnavneområde": "POLYGON ((689614.504882 6159819.35656, 689711.933656 6159597.59578, 688475.328649 6159054.30353, 688377.899875 6159276.0643, 689614.504882 6159819.35656))",
          "vejnavnebeliggenhed_vejtilslutningspunkter": "GEOMETRYCOLLECTION EMPTY"
        }]
      };

      // import a changeset with a registration time in future will advance virkning time in db
      yield importDarImpl.withDar1Transaction(client, 'api', q.async(function*() {
        yield importDarImpl.importChangeset(client, JSON.parse(JSON.stringify(secondChangeset)));
      }));

      // check that virkning time has been incremented
      const virkningTime = (yield importDarImpl.internal.getMeta(client)).virkning;
      expect(virkningTime).to.equal(future);

      // check that both roads exist now
      const entityCount2 = (yield client.queryp('select count(*)::integer as c from navngivenvej')).rows[0].c;
      expect(entityCount2).to.equal(2);
    }));

    it('Adgangsadresser are updated when any entity that is part of the address changes', q.async(function*() {
      const client = clientFn();

      const makeUpdate = (currentRecord, time, newProps) => {
        const result =  Object.assign({}, currentRecord, newProps);
        return [
          Object.assign({}, currentRecord, {
          registreringtil: time
        }),
        Object.assign({}, result, {
          registreringfra: time,
          virkningtil: time
        }),
        Object.assign({}, result, {
          registreringfra: time,
          virkningfra: time
        })]
      };
      yield importDarImpl.internal.setInitialMeta(client);
      yield importDarImpl.withDar1Transaction(client, 'api', q.async(function*() {
        yield importDarImpl.importChangeset(client, JSON.parse(JSON.stringify(INITIAL_CHANGESET)));
      }));

      // check that address is updated when vejkode changes
      const time2 = '2016-04-22T00:00:00Z';
      const navngivenVejKommunedelChange = {
        NavngivenVejKommunedel: makeUpdate(INITIAL_CHANGESET.NavngivenVejKommunedel[0], time2, {
          vejkode: "0700"
        })
      };
      console.log(JSON.stringify(navngivenVejKommunedelChange, null, 2));
      console.log(JSON.stringify(yield client.queryRows('select * from adgangsadresser'), null, 2));
      yield importDarImpl.withDar1Transaction(client, 'api', q.async(function*() {
        yield importDarImpl.importChangeset(client, navngivenVejKommunedelChange);
      }));

      let updatedAddress = (yield client.queryRows('select * from adgangsadresser'))[0];
      expect(updatedAddress.vejkode).to.equal(700);


      // check that address postnummer is updated when postnummer changes
      const time3 = '2016-04-23T00:00:00Z';
      const postnummerChange = {
        Postnummer: makeUpdate(INITIAL_CHANGESET.Postnummer[0], time3, {
          postnr: "5000"
        })
      };
      yield importDarImpl.withDar1Transaction(client, 'api', q.async(function*() {
        yield importDarImpl.importChangeset(client, postnummerChange);
      }));

      updatedAddress = (yield client.queryp('select * from adgangsadresser')).rows[0];
      expect(updatedAddress.postnr).to.equal(5000);
    }));
  });
});
