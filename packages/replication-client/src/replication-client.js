#!/usr/bin/env node

const {go} = require('ts-csp');
const {parseCommands} = require('@dawadk/common/src/cli/commander-wrapper');
const databasePools = require('@dawadk/common/src/postgres/database-pools');
const impl = require('./replication-client-impl');
const {withReplicationTransaction} = require('./transactions');
const {ReplicationHttpClient} = require('./replication-http-client');
const generateConfig = require('./generate-config');
const {getValidatedConfig, validateAgainstDatabase} = require('./validate-config');
const {generateDDLStatements} = require('./database-schema-util');
const { pgMetadata } = require('./pg-metadata');
const log = require('./log');
const replicationConfigParam = {
  name: 'replication-config',
  type: 'string',
  required: true
};

const parameterSpec = [
  replicationConfigParam, {
    name: 'database',
    type: 'string',
    required: true
  }];

const commands = [{
  name: 'replicate',
  parameters: [...parameterSpec, {
    name: 'force-download',
    type: 'boolean'
  }]
}, {
  name: 'gen-config',
  parameters: []
}, {
  name: 'gen-schema',
  parameters: [replicationConfigParam]
}, {
  name: 'validate-config',
  parameters: parameterSpec
}];

const {command, options, program} = parseCommands(commands, process.argv);
if(!command) {
  program.outputHelp();
  process.exit(0);
}

const runCommand = (command, options) => go(function* () {
  /* eslint no-console: 0 */
  if (command === 'gen-config') {
    const replicationUrl = "https://dawa.aws.dk/replikering";
    const replicationSchema = "dawa_replication";
    const httpClient = new ReplicationHttpClient(replicationUrl, 200);
    const replicationModel = yield httpClient.datamodel();
    console.log(JSON.stringify((generateConfig(replicationUrl, replicationSchema, replicationModel)), null, 2));
  }
  else if (command === 'gen-schema') {
    const [replicationConfig, err] = yield getValidatedConfig(options.replicationConfig);
    if (err) {
      throw err;
    }
    const httpClient = new ReplicationHttpClient(replicationConfig.replication_url, 200);
    const replicationModel = yield httpClient.datamodel();
    console.log(generateDDLStatements(replicationModel, replicationConfig).join(';\n'));
  }
  else {
    const [replicationConfig, err] = yield getValidatedConfig(options.replicationConfig);
    if (err) {
      throw err;
    }
    const httpClient = new ReplicationHttpClient(replicationConfig.replication_url, 200);
    yield databasePools.create("pool", {
      connString: options['database'],
      pooled: false
    });

    const pool = databasePools.get("pool");
    const pgModel =
      yield pool.withTransaction({}, 'READ_ONLY', client => pgMetadata(client));


    if(command === 'validate-config') {
      log('info', 'Validating configuration against database schema...');
      const [valid, errorText] = validateAgainstDatabase(replicationConfig, pgModel);
      if(!valid) {
        log('error', `Configuration invalid: ${errorText}`);
        process.exit(1);
      }
      else {
        log('info', 'Configuration is valid');
      }
    }
    else {
      yield pool.withTransaction({}, 'READ_WRITE', client => withReplicationTransaction(client, replicationConfig.replication_schema, txid => go(function* () {
        const datamodel = yield httpClient.datamodel();
        yield impl.update(client, txid, datamodel, replicationConfig, pgModel, httpClient, {forceDownload: options.forceDownload});
      })));
    }
  }
});

go(function* () {
   try {
    yield runCommand(command, options);
  }
  catch (e) {
     log('error', e.message);
    process.exit(1);
  }
});
