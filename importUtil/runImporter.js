"use strict";

const {go} = require('ts-csp');

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
      throw e;
    }
  }).asPromise().done());
};
