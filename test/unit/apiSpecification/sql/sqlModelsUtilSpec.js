"use strict";

var sqlModelsUtil = require('../../../../apiSpecification/sql/sqlModelsUtil');

describe('applySelect', function() {
  it('It should compute select clause for field without column definition', function() {
    var parts = {select: []};
    sqlModelsUtil.applySelect(parts, { columns: {}}, ['fieldName'], {});
    expect(parts.select).toEqual(['fieldName']);
  });
  it('It should compute select clause for field with simple select', function() {
    var parts = {select: []};
    sqlModelsUtil.applySelect(parts, { columns: { fieldName: {select: 'columnName'}}}, ['fieldName'], {});
    expect(parts.select).toEqual(['columnName as fieldName']);
  });
  it('Should compute select clause for field select and alias', function() {
    var parts = {select: []};
    sqlModelsUtil.applySelect(parts, { columns: { fieldName: {select: 'columnName', as: 'alias'}}}, ['fieldName'], {});
    expect(parts.select).toEqual(['columnName as alias']);
  });
});