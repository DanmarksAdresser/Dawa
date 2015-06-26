"use strict";

var _ = require('underscore');
var oisXmlFacts = require('../apiSpecification/ois/oisXmlFacts');
var datamodels = require('../apiSpecification/ois/oisDatamodels');

var defaultSqlTypes = {
  string: 'text',
  integer: 'integer',
  timestamp: 'timestamptz',
  uuid: 'uuid'
};

function fieldList(fields, primaryKeyField) {
  return fields.map(function(field) {
    var sqlType = defaultSqlTypes[field.type];
    if(!sqlType) {
      throw new Error("Unknown field type " + field.type);
    }
    var fieldSql =  '  ' + field.name + ' ' + sqlType;
    if(primaryKeyField === field.name) {
      fieldSql += ' PRIMARY KEY';
    }
    return fieldSql;
  }).join(',\n');
}

Object.keys(oisXmlFacts).forEach(function(entityName) {
  var entityFacts = oisXmlFacts[entityName];
  var datamodel = datamodels[entityName];
  var sql = 'DROP TABLE IF EXISTS ' + datamodel.table + ';\n';
  sql += "CREATE TABLE " + datamodel.table + ' (\n';
  sql += fieldList(entityFacts.fields, datamodel.key[0]);
  sql += '\n);\n';
  sql += 'DROP TABLE IF EXISTS ' + datamodel.table + '_history;\n';
  sql += 'CREATE TABLE ' + datamodel.table + '_history (\n' +
      '  valid_from integer not null,\n' +
      '  valid_to integer,\n' +
      fieldList(entityFacts.fields, null);
  sql += '\n);\n';
  console.log(sql);
});
