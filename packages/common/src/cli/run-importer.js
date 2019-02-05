"use strict";

const {go} = require('ts-csp');
const Promise = require('bluebird');
const cliParameterParsing = require('./cli-parameter-parsing');
const logger = require('../logger').forCategory('runImporter');
const { sleep } = require('../csp-util');
exports.runImporter = (importerName, optionSpec, requiredOptions, importerFn, importerTimeout) => {
  if(importerTimeout) {
    optionSpec.importerTimeout = [false, 'Terminer importer efter den angivne periode (sekunder)', 'integer', importerTimeout]
  }
  cliParameterParsing.main(optionSpec, requiredOptions, (args, options) => go(function* () {
    let timeoutProcess;
    if (importerTimeout) {
      timeoutProcess = go(function* () {
        yield this.delegateAbort(sleep(options.importerTimeout * 1000));
        logger.error('Importer timed out, aborting', {
          importerName,
          timeout: options.importerTimeout
        });
        yield sleep(1000);
        process.exit(1);
      });
    }
    try {
      yield importerFn(args, options);
      logger.info("Ran importer", {
        importerName
      });
    }
    catch (e) {
      logger.error('Importer failed', {
        importerName,
        error: e
      });
      // This is a bit hackish, but we add a little delay to ensure that the logs are flushed to disk before exiting.
      yield Promise.delay(1000);
      throw e;
    }
    if(timeoutProcess) {
      timeoutProcess.abort.raise('');
    }
  }).asPromise().done());
};
