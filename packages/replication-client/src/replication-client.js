#!/usr/bin/env node

/* eslint no-console: 0 */
const { go } = require('ts-csp');
const { parseCommands } = require('@dawadk/common/src/cli/commander-wrapper');
const databasePools  = require('@dawadk/common/src/postgres/database-pools');
const fs = require('fs');
const impl = require('./replication-client-impl');
const { withReplicationTransaction } = require('./transactions');
const { ReplicationHttpClient } = require('./replication-http-client');
const generateConfig = require('./generate-config');
const validateConfig = require('./validate-config');
const { generateDDLStatements } = require('./database-schema-util');
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
  name: 'initialize',
  parameters: parameterSpec
}, {
  name: 'update',
  parameters: [parameterSpec, {
    name: 'use-download',
    type: 'boolean'
  }]
}, {
  name: 'gen-config',
  parameters: []
}, {
  name: 'gen-schema',
  parameters: [replicationConfigParam]
}];

const {command, options} = parseCommands(commands, process.argv);

console.log(command);
console.dir(options);
const getValidatedConfig = (filePath) => {
  let fileText;
  try {
    fileText = fs.readFileSync(filePath, {encoding: 'utf-8'});
  }
  catch(e) {
    console.log(`Could not read file: ${filePath}: ${e.message}`);
    throw e;
  }
  let parsedConfig;
  try {
    parsedConfig = JSON.parse(fileText);
  }
  catch(e) {
    console.log(`Configuration file is not valid json: ${e.message}`);
    throw e;
  }
  const [valid, errorText] = validateConfig(parsedConfig);
  if(!valid) {
    console.log(`Configuration file is not valid: ${errorText}`);
    throw new Error('Invalid configuration file');
  }
  return parsedConfig;
};

if(command === 'gen-config') {
  go(function*() {
    const replicationUrl = "https://dawa.aws.dk/replikering";
    const replicationSchema = "dawa_replikering";
    const httpClient = new ReplicationHttpClient(replicationUrl, 200);
    const replicationModel = yield httpClient.datamodel();
    console.log(JSON.stringify((generateConfig(replicationUrl, replicationSchema, replicationModel)), null, 2));
  }).asPromise().done();
}
else if (command === 'gen-schema') {
  go(function*() {
    const replicationConfig = getValidatedConfig(options.replicationConfig);
    const httpClient = new ReplicationHttpClient(replicationConfig.replication_url, 200);
    const replicationModel = yield httpClient.datamodel();
    console.log(generateDDLStatements(replicationModel, replicationConfig).join(';\n'));
  }).asPromise().done();

}
else {
  go(function*() {
    const replicationConfig = getValidatedConfig(options.replicationConfig);
    const httpClient = new ReplicationHttpClient(replicationConfig.replication_url, 200);
    yield databasePools.create("pool", {
      connString: options['database'],
      pooled: false
    });

    const pool = databasePools.get("pool");
    yield pool.withTransaction({}, 'READ_WRITE', client => withReplicationTransaction(client, replicationConfig.replication_schema, txid => go(function*() {
      const lastTransaction = yield httpClient.lastTransaction();
      const datamodel = yield httpClient.datamodel();
      const remoteTxid = lastTransaction.txid;
      if(command === 'initialize') {
        yield impl.initialize(client, remoteTxid, txid, datamodel, replicationConfig, httpClient);
      }
      else if(command === 'update') {
        if(options.useDownload) {
          yield impl.updateUsingDownload(client, txid, datamodel, replicationConfig, httpClient);
        }
        else {
          yield impl.updateIncrementally(client, txid, datamodel, replicationConfig, httpClient);
        }
      }
    })));
  }).asPromise().done();
}

