"use strict";

const {expect} = require('chai');

const moment = require('moment');
const q = require('q');

const testdb = require('@dawadk/test-util/src/testdb');
const {go} = require('ts-csp');
const {withImportTransaction} = require('../../../importUtil/transaction-util');
const { getMeta, setInitialMeta } = require('../../../dar10/import-dar-util')
const { internal: { importChangeset } } = require('../../../components/importers/dar-api');
const darHistoryProcessors = require('../../../components/processors/dar-history');
const darCurrentProcessors = require('../../../components/processors/dar-current');
const { execute } = require('../../../components/execute');
const { EXECUTION_STRATEGY } = require('../../../components/common');

const simulateImport = (client, txid, changeset) => go(function*() {
  yield importChangeset(client, txid, JSON.parse(JSON.stringify(changeset)));
  yield execute(client, txid, [...darHistoryProcessors, ...darCurrentProcessors], EXECUTION_STRATEGY.preferIncremental);
});

describe('Beregning af DAR aktuelle entiteter', function () {
  testdb.withTransactionEach('empty', clientFn => {
    it('Når virkningstid avanceres, håndteres fremtidige ændringer', q.async(function* () {
      const client = clientFn();
      yield setInitialMeta(client);
      const now = (yield client.queryRows('SELECT NOW() AS n'))[0].n;
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
      yield withImportTransaction(client, 'importDar', (txid) => go(function* () {
        yield simulateImport(client, txid, JSON.parse(JSON.stringify(firstChangeset)));
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
      yield withImportTransaction(client, 'importDar', (txid) => go(function* () {
        yield simulateImport(client, txid, JSON.parse(JSON.stringify(secondChangeset)));
      }));

      // check that virkning time has been incremented
      const virkningTime = (yield getMeta(client)).virkning;
      expect(virkningTime).to.equal(future);

      // check that both roads exist now
      const entityCount2 = (yield client.queryp('select count(*)::integer as c from dar1_navngivenvej_current')).rows[0].c;
      expect(entityCount2).to.equal(2);
    }));
  });
});
