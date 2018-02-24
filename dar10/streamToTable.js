"use strict";

/*
 * Stream a DAR 1.0 supplied ndjson file to a PostgreSQL table. Optionally validates every
 * object.
 */
const importUtil = require('../importUtil/importUtil');
const dar10TableModels = require('./dar10TableModels');
const postgresMapper = require('./postgresMapper');

module.exports = function(client, entityName, filePath, targetTable, validate) {
  const columnNames = dar10TableModels.rawTableModels[entityName].columns.map(column => column.name);
  const mapFn = postgresMapper.createMapper(entityName, validate);
  return importUtil.streamNdjsonToTable(client, filePath, targetTable, columnNames, mapFn);
};
