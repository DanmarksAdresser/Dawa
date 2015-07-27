"use strict";

var _ = require('underscore');
var oisApiFacts = require('../apiSpecification/ois/oisApiFacts');
var oisXmlFacts = require('../apiSpecification/ois/oisXmlFacts');
var datamodels = require('../apiSpecification/ois/oisDatamodels');

var defaultSqlTypes = {
  string: 'text',
  integer: 'integer',
  timestamp: 'timestamptz',
  uuid: 'uuid'
};

function postgresType(field) {
  if(field.type === 'timestamp') {
    return 'timestamptz';
  }
  if(field.oisType === 'tinyint' || field.oisType === 'smallint') {
    return 'smallint';
  }
  if(field.oisType === 'int') {
    return 'integer';
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
  return defaultSqlTypes[field.type];
}

function fieldList(fields, primaryKeyField) {
  return fields.map(function(field) {
    var sqlType = postgresType(field);
    var fieldSql =  '  ' + field.name + ' ' + sqlType;
    if(primaryKeyField === field.name) {
      fieldSql += ' PRIMARY KEY';
    }
    return fieldSql;
  }).join(',\n');
}

function createIndices(apiFacts, xmlFacts) {
  var sqlStatements = apiFacts.filterableFields.map(function(dawaName) {
    var field = _.findWhere(xmlFacts.fields, {dawaName: dawaName});
    return 'CREATE INDEX ON ' + apiFacts.table + '(' + field.name + ');';
  });
  return sqlStatements.join('\n') + '\n';
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
      '  valid_from integer,\n' +
      '  valid_to integer,\n' +
      fieldList(entityFacts.fields, null);
  sql += '\n);\n';
  sql += createIndices(oisApiFacts[entityName], entityFacts);
  console.log(sql);
});
