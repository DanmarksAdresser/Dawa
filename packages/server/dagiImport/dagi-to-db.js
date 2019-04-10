#!/usr/bin/env node
"use strict";

const _ = require('underscore');
const { go } = require('ts-csp');
const runConfiguredImporter  = require('@dawadk/import-util/src/run-configured-importer');
const { withImportTransaction } = require('../importUtil/transaction-util');

const logger = require('@dawadk/common/src/logger').forCategory('dagiToDb');

const featureMappingsDatafordeler = require('./featureMappingsDatafordeler');
const featureMappingsZone = require('./featureMappingsZone');
const proddb = require('../psql/proddb');
const {makeAllChangesNonPublic} = require('@dawadk/import-util/src/materialize');
const importDagiImpl = require('./importDagiImpl');

const featureMappingsMap = {
  zone: featureMappingsZone,
  datafordeler: featureMappingsDatafordeler
};

const schema = {
  data_dir: {
    doc: 'Directory with DAGI theme files',
    format: 'string',
    default: '.',
    cli: true
  },
  file_prefix: {
    doc: 'Prefix for DAGI theme files',
    format: 'string',
    default: '',
    cli: true
  },
  service: {
    doc: 'WFS source: datafordeler or zone',
    format: 'string',
    required: true,
    default: null,
    cli: true
  },
  themes: {
    doc: 'DAGI themes to import separated by comma',
    format: 'string',
    default: null,
    cli: true
  },
  max_changes: {
    doc: 'Maximum number of changes to address associations allowed per theme',
    format: 'nat',
    default: 10000,
    cli: true
  },
  init: {
    doc: 'Initializing load - only set this on first import',
    format: 'Boolean',
    default: false,
    cli: true
  }
};

runConfiguredImporter('dagi-to-db', schema,  (config) => go(function*() {
  proddb.init({
    connString: config.get('database_url'),
    pooled: false
  });

    try {
      const featureMappings = featureMappingsMap[config.get('service')];
      const temaNames= config.get('themes') ? config.get('themes').split(',') : _.keys(featureMappings);
      if(!featureMappings) {
        throw new Error("Ugyldig værdi for parameter service");
      }
      yield proddb.withTransaction('READ_WRITE', client => go(function*() {
        yield withImportTransaction(client, 'dagiToDb', (txid) => go(function*() {
          const source = config.get('service') === 'datafordeler' ? 'wfsMulti' : 'wfs';
          yield importDagiImpl(client, txid, temaNames, featureMappings, config.get('data_dir'), config.get('file_prefix'), source, config.get('max_changes'));
          if(config.get('init')) {
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
}));
