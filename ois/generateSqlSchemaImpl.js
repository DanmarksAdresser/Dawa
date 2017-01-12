"use strict";

var oisModels = require('./oisModels');

const oisCommon = require('./common');
const indices = require('./indices');

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
    return 'text';
  }
  if(field.oisType === 'decimal') {
    return 'numeric';
  }
  return defaultSqlTypes[field.type];
}

function fieldList(model) {
  const oisFields = model.fields.map(function(field) {
    var sqlType = postgresType(field);
    var fieldSql =  '  ' + field.name + ' ' + sqlType;
    return fieldSql;
  });

  const derivedFields = model.derivedFields.map(field => {
    return `${field.name} ${field.postgresType}`;
  });
  return oisFields.concat(derivedFields).join(',\n');
}

const dawaTableName = (oisEntityName) => {
  return `ois_${oisEntityName}`;
};



module.exports = () => {
  const tableSql = Object.keys(oisModels).map(function(entityName) {
    const model = oisModels[entityName];
    const sql = `DROP TABLE IF EXISTS ${dawaTableName(entityName)};
CREATE TABLE ${dawaTableName(entityName)}(
${fieldList(model)},
PRIMARY KEY(${model.key.join(', ')})
);
DROP TABLE IF EXISTS ${dawaTableName(entityName)}_history;
CREATE TABLE ${dawaTableName(entityName)}_history(
valid_from integer,
valid_to integer,
${fieldList(model)}
);`;
    return sql;
  }).join(';\n');

  const indexSql = indices.map(index =>
  `CREATE INDEX ON ${oisCommon.dawaTableName(index.entity)}(${index.columns.join(', ')});\n`
  ).join('');

  const geomIndexSql = `CREATE INDEX ON ${oisCommon.dawaTableName('bygningspunkt')} USING GIST (geom);`;
  return `${tableSql}\n${indexSql}\n${geomIndexSql}`;


};
