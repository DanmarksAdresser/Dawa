"use strict";

var oisModels = require('./oisModels');

var defaultSqlTypes = {
  string: 'text',
  integer: 'integer',
  timestamp: 'timestamptz',
  uuid: 'uuid'
};

function postgresType(field) {
  if(field.oisType === 'tinyint' || field.oisType === 'smallint') {
    return 'int2';
  }
  if(field.oisType === 'int') {
    return 'int4';
  }
  if(field.oisType === 'bigint') {
    return 'int8';
  }
  if(field.oisType === 'uniqueidentifier') {
    return 'uuid';
  }
  if(field.oisType === 'varchar') {
    return 'text';
  }
  if(field.oisType === 'char') {
    return 'char(' + field.oisLength + ')';
  }
  if(field.oisType === 'decimal') {
    return 'numeric';
  }
  return defaultSqlTypes[field.type];
}

function fieldList(fields) {
  return fields.map(function(field) {
    var sqlType = postgresType(field);
    var fieldSql =  '  ' + field.name + ' ' + sqlType;
    return fieldSql;
  }).join(',\n');
}

const dawaTableName = (oisEntityName) => {
  return `ois_${oisEntityName}`;
};

module.exports = () => {
  return Object.keys(oisModels).map(function(entityName) {
    const model = oisModels[entityName];
    const sql = `DROP TABLE IF EXISTS ${dawaTableName(entityName)};
CREATE TABLE ${dawaTableName(entityName)}(
${fieldList(model.fields)},
PRIMARY KEY(${model.key.join(', ')})
);
DROP TABLE IF EXISTS ${dawaTableName(entityName)}_history;
CREATE TABLE ${dawaTableName(entityName)}_history(
valid_from integer,
valid_to integer,
${fieldList(model.fields)}
);`;
    return sql;
  }).join(';\n');
};
