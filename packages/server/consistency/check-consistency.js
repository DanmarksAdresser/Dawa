#!/usr/bin/env node
"use strict";

const {go} = require('ts-csp');
const fs = require('fs');

const runConfiguredImporter = require('@dawadk/import-util/src/run-configured-importer');
const tableSchema = require('../psql/tableModel');
const logger = require('@dawadk/common/src/logger').forCategory('checkConsistency');
const schema = {
    report_file: {
        doc: 'File to store report in',
        format: 'string',
        cli: true,
        required: true,
        default: null
    }
};

runConfiguredImporter('consistencyChecker', schema, function (config) {
    const proddb = require('../psql/proddb');
    const {relations} = require('../ois2/relations');
    const {getTableModel: getCurrentBbrTableModel} = require('../ois2/table-models');
    const {checkForeignKey} = require('./referential-consistency-check');

    proddb.init({
        connString: config.get('database_url'),
        pooled: false
    });

    const externalRefs = {
        husnummer: 'dar1_Husnummer_current',
        adresse: 'dar1_Adresse_current',
        jordstykke: 'matrikel_jordstykker',
        kommune: 'kommuner'
    };

    const externalRefColumns = {
        jordstykke: 'featureid'
    };

    const getTableModel = entityName => {
        if (externalRefs[entityName]) {
            return tableSchema.tables[externalRefs[entityName]];
        } else {
            return getCurrentBbrTableModel(entityName, 'current');
        }
    }

    const fkSpecs = relations.filter(relation => relation.attribute !== 'kommunekode').map(relation => {
        const sourceTableModel = getTableModel(relation.entity);
        const targetTableModel = getTableModel(relation.references);
        const sourceColumns = [relation.attribute];
        const targetColumns = [externalRefColumns[relation.references] || targetTableModel.primaryKey[0]];
        return {
            source: {
                table: sourceTableModel.table,
                columns: sourceColumns
            },
            target: {
                table: targetTableModel.table,
                columns: targetColumns
            }
        }
    });
    return proddb.withTransaction('READ_ONLY', client => go(function* () {
        const report = [];
        for (let spec of fkSpecs) {
            logger.info('Checking foreign key spec ' + JSON.stringify(spec));
            report.push(yield checkForeignKey(client, spec, 10));
        }
        fs.writeFileSync(config.get('report_file'),
            JSON.stringify(report, null, 2),
            {encoding: 'utf8'});
    }));
}, 60 * 60 * 3);
