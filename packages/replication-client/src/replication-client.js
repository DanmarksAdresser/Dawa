#!/usr/bin/env node
const Promise = require('bluebird');
Promise.config({
  longStackTraces: true
});
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
const pgConnectionString = require("pg-connection-string");
const log = require('./log');
const fs = require('fs');
const path = require('path');
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
      description: 'Replicate data to local database',
      parameters: [...parameterSpec, {
        name: 'force-download',
        type: 'boolean',
        description: `Download a complete copy of all entities instead of relying on events to perform the update.\
 Used if new attributes has been added, or if data inconsistencies are suspected.`
      },
      entitiesParam]
    },
    {
      name: 'gen-config',
      description: 'Generate a configuration for the client',
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
      description: 'Generate a database schema',
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
      description: 'Validate a configuration file.',
      parameters:
      parameterSpec
    }
  ]
;
const version = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'))).version;

const httpClientParams = {batchSize: 200, userAgent: `DAWAReplicationClient,version=${version}`};
const {command, options} = parseCommands(commands, process.argv, version);

const runCommand = (command, options) => go(function* () {
  if (command === 'gen-config') {
    const replicationUrl = options.url;
    const replicationSchema = "dawa_replication";
    const httpClient = new ReplicationHttpClient(replicationUrl, httpClientParams);
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
    const httpClient = new ReplicationHttpClient(replicationConfig.replication_url, httpClientParams);
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
    const httpClient = new ReplicationHttpClient(replicationConfig.replication_url, httpClientParams);
    const {host, port, user, database, password}  = pgConnectionString(options.database);
    log('info', `Connecting to database using host=${host ? host : ''}, port=${port ? port : ''}, database=${database}, user=${user}, password=${password ? '<hidden>' : '(none)'}`);

    try {
      yield databasePools.create("pool", {
        connString: options['database'],
        pooled: false,
        noRetry: true
      });
    }
    catch(e) {
      log('error', `Failed to connect to database: ${e.message}`);
      process.exit(1);
    }

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
        yield impl.update(client, txid, datamodel, replicationConfig, pgModel, httpClient, {forceDownload: options.forceDownload, entities: options.entities});
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
