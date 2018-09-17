"use strict";

const {go} = require('ts-csp');
const Promise = require('bluebird');
const cliParameterParsing = require('../bbr/common/cliParameterParsing');
const logger = require('../logger').forCategory('runImporter');

exports.runImporter = (importerName, optionSpec, requiredOptions, importerFn) => {
  cliParameterParsing.main(optionSpec, requiredOptions, (args, options) => go(function*() {
    try {
      yield importerFn(args, options);
      logger.info("Ran importer", {
        importerName
      });
    }
    catch(e) {
      logger.error('Importer failed', {
        importerName,
        error: e
      });
      // This is a bit hackish, but we add a little delay to ensure that the logs are flushed to disk before exiting.
      yield Promise.delay(1000);
      throw e;
    }
  }).asPromise().done());
};
