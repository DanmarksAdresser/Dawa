#!/usr/bin/env node
"use strict";
const {assert} = require('chai');
const {go} = require('ts-csp');
const _ = require('underscore');
const runConfiguredImporter = require('@dawadk/import-util/src/run-configured-importer');
const proddb = require('../psql/proddb');
const {loadDictionary} = require('./load-dictionary-impl');
const schema = {
    dictionary_version: {
        doc: 'Version af ordbøger, som skal anvendes',
        format: 'string',
        cli: true,
        required: true,
        default: null
    },
};
runConfiguredImporter('load-dictionary', schema, function (config) {
    const {execute} = require('../components/execute');
    const {EXECUTION_STRATEGY} = require('../components/common');
    const {withImportTransaction} = require('../importUtil/transaction-util');
    const {allProcessors} = require('../components/processors/all-processors');

    proddb.init({
        connString: config.get('database_url'),
        pooled: false
    });
    const dictVersion = config.get('dictionary_version');
    return proddb.withTransaction('READ_WRITE', client => go(function* () {
        yield loadDictionary(client, dictVersion);
        const tablesToRefresh = ['adgangsadresser_mat', 'adresser_mat'];
        const processorsToVerify = allProcessors.filter(processor => _.intersection(processor.produces, tablesToRefresh).length > 0);
        assert.strictEqual(processorsToVerify.length, 2);
        yield withImportTransaction(client, 'loadDictionary', (txid) => go(function* () {
            yield execute(client, txid, processorsToVerify, EXECUTION_STRATEGY.verify);
        }));
    }));
});
