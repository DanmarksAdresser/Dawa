const {go} = require('ts-csp');

const tableSchema = require('../../psql/tableModel');
const {ALL_DAR_ENTITIES} = require('../../dar10/import-dar-util');
const {createCurrentProcessor} = require('@dawadk/import-util/src/current-processor');
const {getMaterialization} = require('@dawadk/import-util/src/current-util');

module.exports = ALL_DAR_ENTITIES.map(entityName => {
    const historyTableModel = tableSchema.tables[`dar1_${entityName}_history`];
    const currentTableModel = tableSchema.tables[`dar1_${entityName}_current`];
    const materialization = getMaterialization(historyTableModel, currentTableModel);
    const currentProcessor = createCurrentProcessor(
        {historyTableModel, currentTableModel, materialization, tsTableName: 'dar1_meta'});
    const execute = (client, txid, strategy, context) => go(function* () {
        const darMetaChanged = context['DAR-meta-changed'];
        if (context.changes[historyTableModel.table].total > 0 ||
            darMetaChanged) {
            yield currentProcessor.execute(client, txid, strategy, context);
        }
    });
    return Object.assign({}, currentProcessor, {execute});
});
