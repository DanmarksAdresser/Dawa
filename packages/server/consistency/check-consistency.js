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
        const jsonText = JSON.stringify(report, null, 2);
        if(config.get('report_file')) {
            fs.writeFileSync(config.get('report_file'),
                jsonText,
                {encoding: 'utf8'});
        }
        else {
            const {uploadToS3} = require('@dawadk/import-util/src/s3-offload');
            const s3 = require('@dawadk/import-util/src/s3-util').createS3();
            const bucket = config.get('s3_offload.bucket');
            const prefix = config.get('s3_offload.key_prefix');
            const fileName = `consistency-report.json`;
            yield uploadToS3(s3, bucket, `reports`, `${prefix}${fileName}`, jsonText);
        }
    }));
}, 60 * 60 * 3);
