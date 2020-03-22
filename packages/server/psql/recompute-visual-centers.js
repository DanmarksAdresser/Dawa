#!/usr/bin/env node
"use strict";


const { go } = require('ts-csp');
const runConfiguredImporter = require('@dawadk/import-util/src/run-configured-importer');

const schema = {
};

runConfiguredImporter('recomputeVisualCenters', schema, config => go(function*() {
    const proddb = require('./proddb');
    const { withImportTransaction } = require('../importUtil/transaction-util');
    const {geomColumn} = require( "@dawadk/import-util/src/common-columns");
    const { computeVisualCenters } = require('@dawadk/import-util/src/visual-center');
    const tableSchema = require('./tableModel');
    const {computeDifferences, applyChanges} = require('@dawadk/import-util/src/table-diff');
    proddb.init({
        connString:config.get('database_url'),
        pooled: false
    });

    yield proddb.withTransaction('READ_WRITE', function(client){
        return withImportTransaction(client, 'recomputeVisualCenters', (txid) => go(function*(){
            const tableModels = [tableSchema.tables.landpostnumre];
            for(let tableModel of tableModels) {
                const visualCenterColumn = tableModel.columns.find(col => col.type === 'visueltCenterComputed');
                if(!visualCenterColumn) {
                    continue;
                }
                yield client.query(`create temp table source as (select ${txid} as txid, * from ${tableModel.table})`);
                yield client.query(`update source set visueltcenter = null`);
                yield computeVisualCenters(client, txid, tableModel, 'source');
                const updatedColumns = [...tableModel.columns.filter(col => col !== visualCenterColumn), geomColumn({name: 'visueltCenter'})];
                const updatedTableModel = Object.assign({}, tableModel, {columns: updatedColumns});
                yield computeDifferences(client, txid, 'source', updatedTableModel);
                yield applyChanges(client, txid, tableModel);
                yield client.query('drop table source');
            }
        }));
    });
}));

