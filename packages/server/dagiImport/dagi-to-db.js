#!/usr/bin/env node
"use strict";

const _ = require('underscore');
const { go } = require('ts-csp');
const { runImporter } = require('@dawadk/common/src/cli/run-importer');
const { withImportTransaction } = require('../importUtil/transaction-util');

const logger = require('@dawadk/common/src/logger').forCategory('dagiToDb');

const featureMappingsNew = require('./featureMappingsNew');
const featureMappingsDatafordeler = require('./featureMappingsDatafordeler');
const featureMappingsZone = require('./featureMappingsZone');
const proddb = require('../psql/proddb');
const {makeAllChangesNonPublic} = require('@dawadk/import-util/src/materialize');
const importDagiImpl = require('./importDagiImpl');

const featureMappingsMap = {
  newDagi: featureMappingsNew,
  zone: featureMappingsZone,
  datafordeler: featureMappingsDatafordeler
};

const optionSpec = {
  pgConnectionUrl: [false, 'URL som anvendes ved forbindelse til databasen', 'string'],
  dataDir: [false, 'Folder med DAGI tema-filer', 'string', '.'],
  filePrefix: [false, 'Prefix på DAGI tema-filer', 'string', ''],
  service: [false, 'WFS kilde: newDagi, datafordeler eller zone', 'string'],
  temaer: [false, 'Inkluderede DAGI temaer, adskilt af komma','string'],
  init: [false, 'Initialiserende indlæsning - KUN FØRSTE GANG', 'boolean', false],
  maxChanges: [false, 'Maximalt antal ændringer der udføres på adressetilknytninger (pr. tema)', 'number', 10000]
};

runImporter('dagi-to-db', optionSpec, _.without(_.keys(optionSpec), 'temaer'), function (args, options) {
  proddb.init({
    connString: options.pgConnectionUrl,
    pooled: false
  });

  return go(function*() {
    try {
      const featureMappings = featureMappingsMap[options.service];
      const temaNames= options.temaer ? options.temaer.split(',') : _.keys(featureMappings);
      if(!featureMappings) {
        throw new Error("Ugyldig værdi for parameter service");
      }
      yield proddb.withTransaction('READ_WRITE', client => go(function*() {
        yield withImportTransaction(client, 'dagiToDb', (txid) => go(function*() {
          const source = options.service === 'datafordeler' ? 'wfsMulti' : 'wfs';
          yield importDagiImpl(client, txid, temaNames, featureMappings, options.dataDir, options.fild1Prefix, source, options.maxChanges);
          if(options.init) {
            yield makeAllChangesNonPublic(client, txid);
          }
        }));
      }));
      logger.info('Indlæsning af DAGI temaer gennemført', { temaer: temaNames});
    }
    catch(err) {
      logger.error('Indlæsning af DAGI tema fejlet', {
        error: err
      });
      throw err;
    }
  });
});
