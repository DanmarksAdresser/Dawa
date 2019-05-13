"use strict";

const {go} = require('ts-csp');
const Promise = require('bluebird');
const logger = require('@dawadk/common/src/logger').forCategory('runImporter');
const { sleep } = require('@dawadk/common/src/csp-util');
const runConfigured = require('@dawadk/common/src/cli/run-configured');
const configHolder = require('@dawadk/common/src/config/holder');

module.exports = (importerName, configSchema, importerFn) => {
  const schema = configHolder.mergeConfigSchemas([
    require('../conf/schemas/importer-cli-schema'),
    require('../conf/schemas/s3-offload-schema'),
    configSchema]);
  return runConfigured(schema, [], (config) => go(function*() {
    let timeoutProcess;
    if (config.get('importer_timeout')) {
      timeoutProcess = go(function* () {
        yield this.delegateAbort(sleep(config.get('importer_timeout') * 1000));
        logger.error('Importer timed out, aborting', {
          importerName,
          timeout: config.get('importer_timeout')
        });
        yield sleep(1000);
        process.exit(1);
      });
    }
    try {
      yield importerFn(config);
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
  }));
};