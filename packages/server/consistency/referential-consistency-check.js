const {go} = require('ts-csp');
const tableSchema = require('../psql/tableModel');
const _ = require('underscore');

const checkForeignKey = (client, fkSpec, limit) => go(function* () {
    const sourceTable = fkSpec.source.table;
    const targetTable = fkSpec.target.table;
    const sourceTableModel = tableSchema.tables[sourceTable];
    const targetTableModel = tableSchema.tables[targetTable];
    const equalClause = _.zip(fkSpec.source.columns, fkSpec.target.columns).map(([sourceCol, targetCol]) => `${sourceTable}.${sourceCol} = ${targetTable}.${targetCol}`).join(" AND ");
    const fromWhere = `FROM ${sourceTableModel.table} 
              WHERE ${fkSpec.source.columns.map(col => `${col} IS NOT NULL`).join(' AND ')} AND NOT EXISTS (SELECT * FROM ${targetTableModel.table} WHERE ${equalClause})`;
    const count = (yield client.queryRows(`select count(*)::integer as c ${fromWhere}`))[0].c;
    const missing = yield client.queryRows(
        `select ${sourceTableModel.primaryKey.join(', ')}, ${fkSpec.source.columns.join(', ')}
        ${fromWhere} LIMIT $1`, [limit]);
    const rows = missing.map(row => {
        const extractCols = colNames => colNames.reduce((acc, colName) => {
            acc[colName] = row[colName.toLowerCase()];
            return acc;
        }, {});
        return {
            primaryKey: extractCols(sourceTableModel.primaryKey),
            referencingColumnValues: extractCols(fkSpec.source.columns)
        }
    });
    return {
        count,
        table: sourceTable,
        referencedTable: targetTable,
        referencingColumns: fkSpec.source.columns,
        rows
    };
});

module.exports = {
    checkForeignKey
};
