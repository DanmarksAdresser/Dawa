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
const {pgMetadata} = require('./pg-metadata');
const log = require('./log');
const fs = require('fs');
const replicationConfigParam = {
  name: 'replication-config',
  description: 'Path to configuration file',
  type: 'string',
  required: true
};

const entitiesParam = {
  name: 'entities',
  description: 'Comma-separated list of entities to include',
  type: 'string',
  multiValued: true
};

const parameterSpec = [
  replicationConfigParam, {
    name: 'database',
    description: 'URI describing how to connect to the database, e.g. "postgres://someuser:somepassword@localhost:5432/somedatabase"',
    type: 'string',
    required: true
  }];

const commands = [
    {
      name: 'replicate',
      parameters: [...parameterSpec, {
        name: 'force-download',
        type: 'boolean'
      }]
    },
    {
      name: 'gen-config',
      parameters: [{
        name: 'url',
        description: 'URL of replication API, default "https://dawa.aws.dk/replikering"',
        type: 'string',
        defaultValue: 'https://dawa.aws.dk/replikering'
      },
        {
          name: 'file',
          description: 'Output file for configuration',
          type: 'string',
          required: true

        },
        entitiesParam
      ]
    },
    {
      name: 'gen-schema',
      parameters:
        [replicationConfigParam, {
          name: 'with-change-tables',
          description: 'Generate change tables',
          type: 'boolean'
        }, {
          name: 'drop-before-create',
          description: 'Drop tables and types before recreating them',
          type: 'boolean'
        }, {
          name: 'file',
          description: 'Output file for schema',
          type: 'string',
          required: true
        }]
    }
    ,
    {
      name: 'validate-config',
      parameters:
      parameterSpec
    }
  ]
;

const {command, options, program} = parseCommands(commands, process.argv);
if (!command) {
  program.outputHelp();
  process.exit(0);
}

const runCommand = (command, options) => go(function* () {
  if (command === 'gen-config') {
    const replicationUrl = options.url;
    const replicationSchema = "dawa_replication";
    const httpClient = new ReplicationHttpClient(replicationUrl, 200);
    const replicationModel = yield httpClient.datamodel();
    const jsonText = JSON.stringify((generateConfig(replicationUrl, replicationSchema, replicationModel, {
      entities: options.entities
    })), null, 2);
    fs.writeFileSync(options.file, jsonText, {encoding: 'utf-8'});
  }
  else if (command === 'gen-schema') {
    const [replicationConfig, err] = yield getValidatedConfig(options.replicationConfig);
    if (err) {
      throw err;
    }
    const httpClient = new ReplicationHttpClient(replicationConfig.replication_url, 200);
    const replicationModel = yield httpClient.datamodel();
    const ddl = generateDDLStatements(replicationModel, replicationConfig, {
      withChangeTables: options.withChangeTables,
      dropBeforeCreate: options.dropBeforeCreate
    }).join(';\n');
    fs.writeFileSync(options.file, ddl, {encoding: 'utf-8'});
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


    if (command === 'validate-config') {
      log('info', 'Validating configuration against database schema...');
      const [valid, errorText] = validateAgainstDatabase(replicationConfig, pgModel);
      if (!valid) {
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
