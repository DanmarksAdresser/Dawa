const {ALL_DAR_ENTITIES} = require('../../dar10/import-dar-util');
const {createHistoryProcessor} = require('@dawadk/import-util/src/history-processor');
const tableSchema = require('../../psql/tableModel');

module.exports = ALL_DAR_ENTITIES.map(entityName => {
    const historyTableModel = tableSchema.tables[`dar1_${entityName}_history`];
    const bitemporalTableModel = tableSchema.tables[`dar1_${entityName}`];
    return createHistoryProcessor(bitemporalTableModel, historyTableModel);
});