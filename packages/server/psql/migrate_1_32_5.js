"use strict";
const path = require('path');
const {go} = require('ts-csp');
const fs = require('fs');
const runConfigured = require('@dawadk/common/src/cli/run-configured');
const proddb = require('./proddb');
const configHolder = require('@dawadk/common/src/config/holder');
const {reloadDatabaseCode,} = require('./initialization');
const { withImportTransaction } = require('../importUtil/transaction-util');
const {clearAndMaterialize} = require('@dawadk/import-util/src/materialize');
const { createChangeTable } = require('@dawadk/import-util/src/table-diff');
const tableSchema = require('./tableModel');
const schema = configHolder.mergeConfigSchemas([
    {
        database_url: {
            doc: "URL for databaseforbindelse",
            format: 'string',
            default: null,
            cli: true,
            required: true
        },
    },
    require('@dawadk/import-util/conf/schemas/s3-offload-schema')
]);


runConfigured(schema, [], config => go(function* () {
    proddb.init({
        connString: config.get('database_url'),
        pooled: false
    });

    yield go(function* () {
        yield proddb.withTransaction('READ_WRITE', client => go(function* () {
            yield client.query(fs.readFileSync(path.join(__dirname, 'schema/tables/navngivenvejpostnummerrelation.sql'), {encoding: 'utf-8'}));
            yield createChangeTable(client, tableSchema.tables.navngivenvejpostnummerrelation);
            yield reloadDatabaseCode(client, path.join(__dirname, 'schema'));
            yield withImportTransaction(client, 'migrate_1_32_0', (txid) => go(function*() {
                yield clearAndMaterialize(client, txid, tableSchema.tables, tableSchema.materializations.navngivenvejpostnummerrelation);
                yield clearAndMaterialize(client, txid, tableSchema.tables, tableSchema.materializations.vejnavnpostnummerrelation);
            }));
        }));
    });
}));