"use strict";

const q = require('q');
const _ = require('underscore');

const cliParameterParsing = require('../bbr/common/cliParameterParsing');
const importDarImpl = require('./importDarImpl');
const logger = require('../logger').forCategory('darImport');
const proddb = require('../psql/proddb');
const { withImportTransaction } = require('../importUtil/importUtil');


const optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string']
};

const NON_PUBLIC_OVERRIDES = {
  vejstykker: {
    aendret: true
  },
  adgangsadresser: {
    aendret: true,
    tekstretning: true,
    adressepunktaendringsdato: true,
    navngivenvej_id: true
  },
  enhedsadresser: {
    aendret: true
  }
}

cliParameterParsing.main(optionSpec, _.keys(optionSpec), function (args, options) {
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });

  proddb.withTransaction('READ_WRITE', function (client) {
    return importDarImpl.withDar1Transaction(client, 'updateDawa', () =>
      withImportTransaction(client, 'importDar', (txid) =>
        importDarImpl.updateDawa(client, txid, NON_PUBLIC_OVERRIDES)));
  }).catch(function (err) {
    logger.error('Caught error in updateDawa', err);
    return q.reject(err);
  }).done();
});
