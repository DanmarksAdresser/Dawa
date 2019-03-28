"use strict";

const { name } = require('@dawadk/import-util/src/table-diff-protocol');
const assert = require('chai').assert;
const tableSchema = require('../../psql/tableModel');
for(let tableName of Object.keys(tableSchema.tables)) {
  it(`Model for ${tableName} should be valid`, () => {
    const table = tableSchema.tables[tableName];
    assert.isString(table.table);
//  assert.isString(table.entity);
    assert.isArray(table.primaryKey);
    assert.isArray(table.columns);
    for(let column of table.columns) {
      assert.isObject(column);
      assert.isString(name(column));
    }
  });
}